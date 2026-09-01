from .nodes import CFGSculptorAdvanced, SimKarrScheduler, ModelRouter, ClipRouter, VaeRouter, PreviewNode

NODE_CLASS_MAPPINGS = {
    "Rimor_CFGSculptorAdvanced": CFGSculptorAdvanced,
    "Rimor_SimKarrScheduler": SimKarrScheduler,
    "Rimor_ModelRouter": ModelRouter,
    "Rimor_ClipRouter": ClipRouter,
    "Rimor_VaeRouter": VaeRouter,
    "Rimor_PreviewNode": PreviewNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Rimor_CFGSculptorAdvanced": "CFG Sculptor Advanced",
    "Rimor_SimKarrScheduler": "SimKarr Scheduler",
    "Rimor_ModelRouter": "Model Router",
    "Rimor_ClipRouter": "CLIP Router",
    "Rimor_VaeRouter": "VAE Router",
    "Rimor_PreviewNode": "Preview",
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]