from comfy_api.latest import ComfyExtension, io


class ModelRouter(io.ComfyNode):
    """Router for MODEL with dynamic port count (6 default, up to 30)."""
    
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Rimor_ModelRouter",
            display_name="Model Router",
            category="Rimor_dev/utilities",
            description="Routes one of N MODEL inputs to output. Default 6 ports, expandable to 30.",
            inputs=[
                io.Int.Input("inputcount", default=6, min=6, max=30, step=1,
                             display_name="Input Count",
                             tooltip="Number of input ports (6-30). Click 'Update inputs' to apply."),
                io.Int.Input("active_channel", default=1, min=1, max=30, step=1,
                             display_name="Active Channel",
                             tooltip="Which input to pass through (1-N)"),
            ],
            outputs=[
                io.Model.Output(),
            ]
        )

    @classmethod
    def execute(cls, inputcount, active_channel, **kwargs) -> io.NodeOutput:
        
        # Собираем все model_N из kwargs
        models = {}
        for key, value in kwargs.items():
            if key.startswith("model_") and value is not None:
                idx = int(key.split("_")[1])
                models[idx] = value
        
        selected = models.get(active_channel)
        if selected is not None:
            print(f"[ModelRouter] Channel {active_channel} — passing model")
            return io.NodeOutput(selected)
        
        print(f"[ModelRouter] Channel {active_channel} has no model connected!")
        return io.NodeOutput(None)

    sample = execute


class ClipRouter(io.ComfyNode):
    """Router for CLIP with dynamic port count (6 default, up to 30)."""
    
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Rimor_ClipRouter",
            display_name="CLIP Router",
            category="Rimor_dev/utilities",
            description="Routes one of N CLIP inputs to output. Default 6 ports, expandable to 30.",
            inputs=[
                io.Int.Input("inputcount", default=6, min=6, max=30, step=1,
                             display_name="Input Count"),
                io.Int.Input("active_channel", default=1, min=1, max=30, step=1,
                             display_name="Active Channel"),
            ],
            outputs=[
                io.Clip.Output(),
            ]
        )

    @classmethod
    def execute(cls, inputcount, active_channel, **kwargs) -> io.NodeOutput:
        
        clips = {}
        for key, value in kwargs.items():
            if key.startswith("clip_") and value is not None:
                idx = int(key.split("_")[1])
                clips[idx] = value
        
        selected = clips.get(active_channel)
        if selected is not None:
            print(f"[ClipRouter] Channel {active_channel} — passing CLIP")
            return io.NodeOutput(selected)
        
        print(f"[ClipRouter] Channel {active_channel} has no CLIP connected!")
        return io.NodeOutput(None)

    sample = execute


class VaeRouter(io.ComfyNode):
    """Router for VAE with dynamic port count (6 default, up to 30)."""
    
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Rimor_VaeRouter",
            display_name="VAE Router",
            category="Rimor_dev/utilities",
            description="Routes one of N VAE inputs to output. Default 6 ports, expandable to 30.",
            inputs=[
                io.Int.Input("inputcount", default=6, min=6, max=30, step=1,
                             display_name="Input Count"),
                io.Int.Input("active_channel", default=1, min=1, max=30, step=1,
                             display_name="Active Channel"),
            ],
            outputs=[
                io.Vae.Output(),
            ]
        )

    @classmethod
    def execute(cls, inputcount, active_channel, **kwargs) -> io.NodeOutput:
        
        vaes = {}
        for key, value in kwargs.items():
            if key.startswith("vae_") and value is not None:
                idx = int(key.split("_")[1])
                vaes[idx] = value
        
        selected = vaes.get(active_channel)
        if selected is not None:
            print(f"[VaeRouter] Channel {active_channel} — passing VAE")
            return io.NodeOutput(selected)
        
        print(f"[VaeRouter] Channel {active_channel} has no VAE connected!")
        return io.NodeOutput(None)

    sample = execute