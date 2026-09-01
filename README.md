# ComfyUI-CFG-Sculptor

An experimental node pack for ComfyUI with dynamic CFG sculpting.

## Description

CFG Sculptor provides a flexible tool for controlling CFG during the sampling process. Instead of a static CFG value, you can build complex curves: envelopes, waveforms, hysteresis, and snapshots at different stages of generation.

The primary goal is experimentation. This sampler was created as a tool for exploring how dynamic CFG affects results, offering maximum configuration flexibility.

## Features

- Dynamic CFG with customizable envelopes
- 10 built-in presets
- Waveforms: sine, triangle, square, sawtooth, fibonacci
- Envelope modes: linear, sigmoid, gaussian, rise_fall, fall_rise, mid_peak, mid_valley, fibonacci
- Hysteresis for smoothing abrupt CFG changes
- Snapshots at specified steps
- Live CFG graph in the interface
- Real-time preview via WebSocket
- Routers for switching models, CLIP, and VAE
- Hybrid Simple+Karras scheduler

## Nodes

### CFG Sculptor Advanced
The main sampling node with dynamic CFG.

<img src="https://github.com/Rimor-dev/my-assets_/blob/main/Sculptor.png" alt="main" width="20%">

Parameters:
- Preset — selection from 10 presets
- CFG Range — start and end CFG values
- Envelope — envelope shape and enable toggle
- Waveform — wave type, amplitude, periods, decay
- Hysteresis — smoothing of abrupt CFG jumps
- Snapshots — save intermediate images at specified steps

### Preview
Node for displaying real-time sampling preview.
Credits to Kijai for the reference node that helped understand how to create a standalone preview node.

### SimKarr Scheduler
Hybrid scheduler combining Simple and Karras.

<img src="https://github.com/Rimor-dev/my-assets_/blob/main/Simkarr.png" alt="main" width="20%">

Parameters:
- Mode — simple_karras or karras_simple
- Split Ratio — step ratio between algorithms
- Denoise Mode — denoise mode toggle

### Model / CLIP / VAE Router
Routers for switching between models, CLIP, and VAE. Support 6 to 30 inputs.

<img src="https://github.com/Rimor-dev/my-assets_/blob/main/routers.png" alt="main" width="20%">

## Installation

Recommended installation method is via AKA (a shell manager for ComfyUI).

Manual installation:

1. Navigate to the custom_nodes folder:

cd ComfyUI/custom_nodes/
Clone the repository:
```bash
git clone https://github.com/Rimor/ComfyUI-CFG-Sculptor
Restart ComfyUI
```

### Workflow Setup
The example_workflows folder contains a sample workflow with four parallel sampling branches (A, B, C, D).

The workflow uses multiple models. You can replace them with any other models available on your system. To do this, open the nested model groups and specify your own model paths.

The main model selection parameter is active_channel in the routers. Switching the channel allows you to quickly change the model, CLIP, and VAE for all branches simultaneously.

### Dependencies
ComfyUI (recent version with comfy_api support)

torch

numpy

### License
MIT

Happy experimenting! May every CFG curve lead to unexpected and interesting results.
