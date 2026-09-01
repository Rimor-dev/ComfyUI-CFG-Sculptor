import base64
import io as pyio
import logging
import torch
import comfy.patcher_extension
import latent_preview
from comfy_api.latest import io
from PIL import Image, ImageOps

try:
    from server import PromptServer
except ImportError:
    PromptServer = None


def _suppressed_preview_image(self_, preview_format, x0):
    return None


class _PreviewWrapper:
    def __init__(self, node_id):
        self.node_id = str(node_id) if node_id is not None else None

    def __call__(self, executor, noise, latent_image, sampler, sigmas, denoise_mask, callback, disable_pbar, seed, latent_shapes=None):
        guider = executor.class_obj
        model_patcher = guider.model_patcher

        previewer = latent_preview.get_previewer(model_patcher.load_device, model_patcher.model.latent_format)
        original_callback = callback
        node_id = self.node_id

        # Подавляем стандартное превью
        prev_methods = []
        targets = [latent_preview.LatentPreviewer]
        stack = list(latent_preview.LatentPreviewer.__subclasses__())
        while stack:
            cls = stack.pop()
            targets.append(cls)
            stack.extend(cls.__subclasses__())
        for cls in targets:
            if "decode_latent_to_preview_image" in cls.__dict__:
                prev_methods.append((cls, cls.__dict__["decode_latent_to_preview_image"]))
                cls.decode_latent_to_preview_image = _suppressed_preview_image

        def new_callback(step, x0, x, total_steps_):
            if previewer is not None and node_id is not None and PromptServer is not None:
                try:
                    out = previewer.decode_latent_to_preview(x0)
                    if isinstance(out, Image.Image):
                        if out.mode != 'RGB':
                            out = out.convert('RGB')
                        
                        max_res = 1024
                        if out.width > max_res or out.height > max_res:
                            out = ImageOps.contain(out, (max_res, max_res), Image.LANCZOS)
                        
                        buf = pyio.BytesIO()
                        out.save(buf, format='JPEG', quality=80)
                        img_b64 = base64.b64encode(buf.getvalue()).decode('ascii')
                        
                        PromptServer.instance.send_sync(
                            "rimor_preview",
                            {
                                "node_id": node_id,
                                "image": img_b64,
                                "w": out.width,
                                "h": out.height,
                                "step": step + 1,
                                "total": total_steps_,
                            },
                            PromptServer.instance.client_id
                        )
                except Exception as e:
                    logging.warning(f"[Rimor Preview] Failed: {e}")
            
            if original_callback is not None:
                original_callback(step, x0, x, total_steps_)

        try:
            return executor(noise, latent_image, sampler, sigmas, denoise_mask, new_callback, disable_pbar, seed, latent_shapes=latent_shapes)
        finally:
            for cls, prev in prev_methods:
                cls.decode_latent_to_preview_image = prev


class PreviewNode(io.ComfyNode):
    RETURN_TYPES = ("MODEL",)
    RETURN_NAMES = ("Model",)
    FUNCTION = "execute"
    CATEGORY = "Rimor_dev/sampling"
    DESCRIPTION = "Preview override for CFG Sculptor"
    
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Rimor_PreviewNode",
            display_name="Preview",
            category="Rimor_dev/sampling",
            description="Preview override for CFG Sculptor",
            inputs=[
                io.Model.Input("model", display_name="Model"),
            ],
            outputs=[
                io.Model.Output(display_name="Model"),
            ],
            hidden=[io.Hidden.unique_id],
        )

    @classmethod
    def execute(cls, model) -> io.NodeOutput:
        m = model.clone()
        m.add_wrapper_with_key(
            comfy.patcher_extension.WrappersMP.OUTER_SAMPLE,
            "rimor_preview_override",
            _PreviewWrapper(cls.hidden.unique_id),
        )
        return io.NodeOutput(m)

    sample = execute