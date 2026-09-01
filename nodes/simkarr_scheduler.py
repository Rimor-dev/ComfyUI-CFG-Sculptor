import torch
import comfy.samplers
from comfy_api.latest import ComfyExtension, io


class SimKarrScheduler(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Rimor_SimKarrScheduler",
            display_name="SimKarr Scheduler",
            category="Rimor_dev/schedulers",
            description="Hybrid scheduler: Simple+Karras or Karras+Simple. NaN-safe, monotonic!",
            inputs=[
                io.Model.Input("model", display_name="Model"),
                io.Int.Input("steps", default=20, min=1, max=10000, display_name="Steps"),
                io.Float.Input("split_ratio", default=0.33, min=0.1, max=0.9, step=0.01, display_name="Split Ratio",
                             tooltip="Fraction of steps for FIRST algorithm"),
                io.Combo.Input("mode", options=["simple_karras", "karras_simple"], 
                               display_name="Mode",
                               tooltip="simple_karras: Simple first (composition) → Karras second (details). karras_simple: Karras first (character) → Simple second (stabilization)"),
                io.Boolean.Input("denoise_mode", default=False, display_name="Denoise Mode"),
                io.Float.Input("denoise", default=1.0, min=0.01, max=1.0, step=0.01, display_name="Denoise"),
            ],
            outputs=[
                io.Sigmas.Output(display_name="sigmas"),
            ]
        )

    @classmethod
    def execute(cls, model, steps, split_ratio, mode, denoise_mode, denoise) -> io.NodeOutput:
        
        ms = model.get_model_object("model_sampling")
        
        first_steps = max(1, int(steps * split_ratio))
        second_steps = steps - first_steps
        if second_steps <= 0:
            second_steps = 1
            first_steps = steps - 1
        
        if mode == "simple_karras":
            first_sched = "simple"
            second_sched = "karras"
            first_name = "Simple"
            second_name = "Karras"
        else:
            first_sched = "karras"
            second_sched = "simple"
            first_name = "Karras"
            second_name = "Simple"
        
        print(f"\n\033[92m[SimKarr] {'='*50}\033[0m")
        print(f"[SimKarr] Mode: {mode}")
        print(f"[SimKarr] Steps: {steps} → {first_name}: {first_steps} + {second_name}: {second_steps}")
        
        try:
            first_sigmas = comfy.samplers.calculate_sigmas(ms, first_sched, first_steps).cpu()
            if first_sigmas[0] < first_sigmas[-1]:
                first_sigmas = first_sigmas.flip(0)
            first_sigmas = first_sigmas[-(first_steps + 1):]
            
            second_sigmas = comfy.samplers.calculate_sigmas(ms, second_sched, second_steps).cpu()
            if second_sigmas[0] < second_sigmas[-1]:
                second_sigmas = second_sigmas.flip(0)
            second_sigmas = second_sigmas[-(second_steps + 1):]
            
            combined = torch.cat([first_sigmas[:-1], second_sigmas])
            
            for i in range(1, len(combined)):
                if combined[i] >= combined[i-1]:
                    combined[i] = combined[i-1] - max(combined[i-1] * 0.01, 0.0001)
            
            if len(combined) > steps + 1:
                combined = combined[-(steps + 1):]
            elif len(combined) < steps + 1:
                extra_needed = steps + 1 - len(combined)
                extra = comfy.samplers.calculate_sigmas(ms, second_sched, extra_needed).cpu()
                if extra[0] < extra[-1]:
                    extra = extra.flip(0)
                combined = torch.cat([combined, extra])
                combined = combined[-(steps + 1):]
            
            if denoise_mode and denoise < 1.0:
                full_steps = int(steps / denoise)
                full = comfy.samplers.calculate_sigmas(ms, "simple", full_steps).cpu()
                full = full[-(steps + 1):]
                combined = full
            
            if torch.isnan(combined).any() or torch.isinf(combined).any():
                print(f"\033[91m[SimKarr] WARNING: Invalid sigmas! Falling back to simple\033[0m")
                combined = comfy.samplers.calculate_sigmas(ms, "simple", steps).cpu()
                combined = combined[-(steps + 1):]
            
            sigma_drop = combined[0] / max(combined[-2], 0.0001) if len(combined) > 1 else 1.0
            print(f"\033[92m[SimKarr] Sigma drop: {sigma_drop:.2f}x\033[0m")
            print(f"[SimKarr] First: {combined[0]:.4f} → Last: {combined[-1]:.4f}")
            print(f"\033[92m[SimKarr] {'='*50}\033[0m\n")
            
        except Exception as e:
            print(f"\033[91m[SimKarr] ERROR: {e}. Falling back to simple\033[0m")
            combined = comfy.samplers.calculate_sigmas(ms, "simple", steps).cpu()
            combined = combined[-(steps + 1):]
        
        return io.NodeOutput(combined)

    get_sigmas = execute