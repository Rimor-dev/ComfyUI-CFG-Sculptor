import math
import torch
import bisect
import os
import comfy.samplers
import comfy.sample
import comfy.model_management
import comfy.model_patcher
import comfy.utils
import latent_preview
from comfy_api.latest import ComfyExtension, io

try:
    from server import PromptServer
except ImportError:
    PromptServer = None


PRESETS = {
    "custom": None,
    "Gentle Breeze": {
        "cfg_start": 3.0, "cfg_end": 1.5,
        "envelope_mode": "linear", "use_envelope": True,
        "waveform": "sine", "wave_amplitude": 0.2, "wave_periods": 2.0,
        "wave_decay": "linear",
        "hysteresis_enabled": False, "hysteresis_factor": 1.5
    },
    "Smooth Operator": {
        "cfg_start": 4.0, "cfg_end": 2.0,
        "envelope_mode": "sigmoid", "use_envelope": True,
        "waveform": "sine", "wave_amplitude": 0.3, "wave_periods": 3.0,
        "wave_decay": "exp",
        "hysteresis_enabled": False, "hysteresis_factor": 1.5
    },
    "Golden Touch": {
        "cfg_start": 5.0, "cfg_end": 2.0,
        "envelope_mode": "fibonacci", "use_envelope": True,
        "waveform": "fibonacci", "wave_amplitude": 0.4, "wave_periods": 3.5,
        "wave_decay": "fibonacci",
        "hysteresis_enabled": False, "hysteresis_factor": 1.5
    },
    "Wave Rider": {
        "cfg_start": 6.0, "cfg_end": 2.0,
        "envelope_mode": "gaussian", "use_envelope": True,
        "waveform": "sine", "wave_amplitude": 0.5, "wave_periods": 4.0,
        "wave_decay": "linear",
        "hysteresis_enabled": True, "hysteresis_factor": 1.3
    },
    "Deep Surge": {
        "cfg_start": 7.0, "cfg_end": 2.0,
        "envelope_mode": "mid_peak", "use_envelope": True,
        "waveform": "triangle", "wave_amplitude": 0.6, "wave_periods": 3.0,
        "wave_decay": "exp",
        "hysteresis_enabled": True, "hysteresis_factor": 1.5
    },
    "Chaos Theory": {
        "cfg_start": 8.0, "cfg_end": 1.5,
        "envelope_mode": "fall_rise", "use_envelope": True,
        "waveform": "sawtooth", "wave_amplitude": 0.7, "wave_periods": 5.0,
        "wave_decay": "none",
        "hysteresis_enabled": False, "hysteresis_factor": 1.5
    },
    "Fibonacci Spiral": {
        "cfg_start": 6.0, "cfg_end": 2.0,
        "envelope_mode": "fibonacci", "use_envelope": True,
        "waveform": "fibonacci", "wave_amplitude": 0.5, "wave_periods": 2.618,
        "wave_decay": "fibonacci",
        "hysteresis_enabled": True, "hysteresis_factor": 1.4
    },
    "Brutal Force": {
        "cfg_start": 9.0, "cfg_end": 2.0,
        "envelope_mode": "mid_peak", "use_envelope": True,
        "waveform": "square", "wave_amplitude": 0.8, "wave_periods": 2.0,
        "wave_decay": "linear",
        "hysteresis_enabled": True, "hysteresis_factor": 1.2
    },
    "Resonance": {
        "cfg_start": 5.0, "cfg_end": 2.5,
        "envelope_mode": "sigmoid", "use_envelope": True,
        "waveform": "sine", "wave_amplitude": 0.4, "wave_periods": 6.28,
        "wave_decay": "exp",
        "hysteresis_enabled": True, "hysteresis_factor": 1.3
    },
    "Total Madness": {
        "cfg_start": 12.0, "cfg_end": 1.0,
        "envelope_mode": "fibonacci", "use_envelope": True,
        "waveform": "sawtooth", "wave_amplitude": 1.0, "wave_periods": 8.0,
        "wave_decay": "none",
        "hysteresis_enabled": False, "hysteresis_factor": 1.5
    },
}


# ===== ФУНКЦИЯ ЛОГИРОВАНИЯ =====
def get_log_file(unique_id):
    node_dir = os.path.dirname(os.path.abspath(__file__))
    log_dir = os.path.join(node_dir, "logs")
    os.makedirs(log_dir, exist_ok=True)
    return os.path.join(log_dir, f"cfg_sculptor_{unique_id}.log")

def log_to_file(log_file, msg):
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(msg + '\n')

def log_debug(log_file, msg):
    log_to_file(log_file, msg)
    print(msg, flush=True)


class CFGSculptorAdvanced(io.ComfyNode):
    RETURN_TYPES = ("IMAGE", "IMAGE", "IMAGE", "IMAGE")
    RETURN_NAMES = ("Snapshot 1", "Snapshot 2", "Snapshot 3", "Final Image")
    FUNCTION = "execute"
    CATEGORY = "Rimor_dev/sampling"
    
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return os.urandom(8).hex()
    
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Rimor_CFGSculptorAdvanced",
            display_name="CFG Sculptor Advanced",
            category="Rimor_dev/sampling",
            description="Dynamic CFG with Fibonacci, hysteresis, snapshots!",
            inputs=[
                io.Noise.Input("noise", display_name="Noise"),
                io.Model.Input("model", display_name="Model"),
                io.Conditioning.Input("positive", display_name="Positive"),
                io.Conditioning.Input("negative", display_name="Negative"),
                io.Sampler.Input("sampler", display_name="Sampler"),
                io.Sigmas.Input("sigmas", display_name="Sigmas"),
                io.Latent.Input("latent_image", display_name="Latent Image"),
                io.Vae.Input("vae", display_name="VAE"),
                
                # Скрытое поле для ID ноды
                io.String.Input("node_id_hidden", default="0", socketless=True, extra_dict={"hidden": True}),
                
                # Скрытые поля для значений
                io.String.Input("preset", default="custom", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("cfg_start", default="2.0", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("cfg_end", default="1.0", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("envelope_mode", default="linear", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("use_envelope", default="true", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("waveform", default="sine", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("wave_amplitude", default="0.3", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("wave_periods", default="2.0", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("wave_decay", default="linear", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("hysteresis_enabled", default="false", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("hysteresis_factor", default="1.5", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("snap1_enabled", default="false", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("snap1_step", default="5", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("snap2_enabled", default="false", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("snap2_step", default="10", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("snap3_enabled", default="false", socketless=True, extra_dict={"hidden": True}),
                io.String.Input("snap3_step", default="15", socketless=True, extra_dict={"hidden": True}),
            ],
            outputs=[
                io.Image.Output(display_name="Snapshot 1"),
                io.Image.Output(display_name="Snapshot 2"),
                io.Image.Output(display_name="Snapshot 3"),
                io.Image.Output(display_name="Final Image"),
            ],
        )

    @classmethod
    def execute(cls, noise, model, positive, negative, sampler, sigmas, latent_image, vae,
                preset=None,
                cfg_start=None, cfg_end=None,
                envelope_mode=None, use_envelope=None,
                waveform=None, wave_amplitude=None, wave_periods=None, wave_decay=None,
                hysteresis_enabled=None, hysteresis_factor=None,
                snap1_enabled=None, snap1_step=None,
                snap2_enabled=None, snap2_step=None,
                snap3_enabled=None, snap3_step=None,
                node_id_hidden=None,
                unique_id=None,
                **kwargs) -> io.NodeOutput:
        
        # ===== ПОЛУЧЕНИЕ РЕАЛЬНОГО ID НОДЫ =====
        if node_id_hidden is not None and node_id_hidden != "0":
            unique_id = node_id_hidden
        elif unique_id is not None and not str(unique_id).startswith("cfg_sculptor"):
            pass
        else:
            unique_id = kwargs.get('node_id') or kwargs.get('id')
            if unique_id is None:
                if not hasattr(CFGSculptorAdvanced, '_node_counter'):
                    CFGSculptorAdvanced._node_counter = 0
                unique_id = CFGSculptorAdvanced._node_counter
                CFGSculptorAdvanced._node_counter += 1
        
        log_file = get_log_file(unique_id)
        
        with open(log_file, 'w', encoding='utf-8') as f:
            f.write(f"=== CFG Sculptor Log - Node {unique_id} ===\n")
        
        log_debug(log_file, f"[DEBUG] Node ID: {unique_id}")
        
        # Default значения
        if preset is None: preset = "custom"
        if cfg_start is None: cfg_start = "2.0"
        if cfg_end is None: cfg_end = "1.0"
        if envelope_mode is None: envelope_mode = "linear"
        if use_envelope is None: use_envelope = "true"
        if waveform is None: waveform = "sine"
        if wave_amplitude is None: wave_amplitude = "0.3"
        if wave_periods is None: wave_periods = "2.0"
        if wave_decay is None: wave_decay = "linear"
        if hysteresis_enabled is None: hysteresis_enabled = "false"
        if hysteresis_factor is None: hysteresis_factor = "1.5"
        if snap1_enabled is None: snap1_enabled = "false"
        if snap1_step is None: snap1_step = "5"
        if snap2_enabled is None: snap2_enabled = "false"
        if snap2_step is None: snap2_step = "10"
        if snap3_enabled is None: snap3_enabled = "false"
        if snap3_step is None: snap3_step = "15"
        
        # Конвертация
        cfg_start = float(cfg_start)
        cfg_end = float(cfg_end)
        use_envelope = use_envelope.lower() == "true"
        wave_amplitude = float(wave_amplitude)
        # ВАЖНО: Ограничиваем wave_amplitude до 1.0
        wave_amplitude = min(wave_amplitude, 1.0)
        wave_amplitude = max(wave_amplitude, 0.0)
        wave_periods = float(wave_periods)
        hysteresis_enabled = hysteresis_enabled.lower() == "true"
        hysteresis_factor = float(hysteresis_factor)
        snap1_enabled = snap1_enabled.lower() == "true"
        snap1_step = int(snap1_step)
        snap2_enabled = snap2_enabled.lower() == "true"
        snap2_step = int(snap2_step)
        snap3_enabled = snap3_enabled.lower() == "true"
        snap3_step = int(snap3_step)
        
        # Пресет
        if preset != "custom" and preset in PRESETS:
            p = PRESETS[preset]
            cfg_start = p["cfg_start"]
            cfg_end = p["cfg_end"]
            envelope_mode = p["envelope_mode"]
            use_envelope = p["use_envelope"]
            waveform = p["waveform"]
            wave_amplitude = p["wave_amplitude"]
            wave_periods = p["wave_periods"]
            wave_decay = p["wave_decay"]
            hysteresis_enabled = p["hysteresis_enabled"]
            hysteresis_factor = p["hysteresis_factor"]
            log_debug(log_file, f"[Rimor] Preset: {preset}")
        
        cfg_floor = min(cfg_start, cfg_end)
        cfg_ceiling = max(cfg_start, cfg_end)
        
        if vae is None:
            raise ValueError("VAE is required for CFG Sculptor Advanced")
        
        latent = latent_image
        latent_image = latent["samples"]
        latent = latent.copy()
        
        latent_image = comfy.sample.fix_empty_latent_channels(
            model, latent_image,
            latent.get("downscale_ratio_spacial", None),
            latent.get("downscale_ratio_temporal", None)
        )
        latent["samples"] = latent_image

        noise_mask = latent.get("noise_mask", None)
        total_steps = sigmas.shape[-1] - 1
        
        cfg_range = abs(cfg_start - cfg_end)
        wave_amplitude_abs = cfg_range * wave_amplitude
        
        log_debug(log_file, f"=== WAVE PARAMETERS ===")
        log_debug(log_file, f"cfg_start={cfg_start}, cfg_end={cfg_end}")
        log_debug(log_file, f"cfg_range={cfg_range}, cfg_floor={cfg_floor}, cfg_ceiling={cfg_ceiling}")
        log_debug(log_file, f"waveform={waveform}")
        log_debug(log_file, f"wave_amplitude={wave_amplitude} (множитель)")
        log_debug(log_file, f"wave_amplitude_abs={wave_amplitude_abs}")
        log_debug(log_file, f"wave_periods={wave_periods}")
        log_debug(log_file, f"wave_decay={wave_decay}")
        log_debug(log_file, f"use_envelope={use_envelope}, envelope_mode={envelope_mode}")
        log_debug(log_file, f"hysteresis_enabled={hysteresis_enabled}, factor={hysteresis_factor}")
        log_debug(log_file, f"========================")
        
        def calculate_cfg(step, total_steps):
            if total_steps <= 1:
                return max(cfg_floor, cfg_start)
            
            t = step / max(total_steps - 1, 1)
            
            # Базовая огибающая
            if use_envelope:
                if envelope_mode == "fibonacci":
                    base = calc_fibonacci_envelope(t, cfg_start, cfg_end)
                else:
                    base = calc_envelope(t, envelope_mode, cfg_start, cfg_end)
                base = max(cfg_floor, min(base, cfg_ceiling))
            else:
                base = cfg_start + (cfg_end - cfg_start) * t
            
            # Волна
            wave = calc_waveform(t, waveform, wave_periods, wave_amplitude_abs, wave_decay)
            
            result = base + wave
            result = max(cfg_floor, min(result, cfg_ceiling))
            
            log_to_file(log_file, 
                f"step={step:3d}/{total_steps} | t={t:.4f} | "
                f"base={base:.3f} | wave={wave:+.3f} | "
                f"result={result:.3f} | floor={cfg_floor:.3f} | ceiling={cfg_ceiling:.3f}")
            
            return result
        
        class CFGSculptorGuider(comfy.samplers.CFGGuider):
            def __init__(self, model_patcher, cfg_calc_func, total_steps, sigmas_array,
                         snap_configs, hysteresis_enabled, hysteresis_factor, cfg_floor, node_id=None):
                super().__init__(model_patcher)
                self.cfg_calc_func = cfg_calc_func
                self.total_steps = total_steps
                self.sigmas_array = sigmas_array
                self.cfg_history = []
                self.snapshot_latents = {}
                self.snap_configs = snap_configs
                self.hysteresis_enabled = hysteresis_enabled
                self.hysteresis_factor = hysteresis_factor
                self.cfg_floor = cfg_floor
                self.previous_cfg = None
                self.node_id = str(node_id) if node_id is not None else None
                self._last_step_idx = -1
                
                self.snap_steps = set()
                for enabled, step in snap_configs:
                    if enabled and 0 <= step < len(sigmas_array):
                        self.snap_steps.add(step)
            
            def find_step_idx(self, sigma):
                # Если уже на последнем шаге - не идём дальше
                if self._last_step_idx >= self.total_steps - 1:
                    return self.total_steps - 1
                
                sigma_val = float(sigma)
                if sigma_val < 0:
                    result = self.total_steps - 1
                else:
                    valid_indices = [i for i, s in enumerate(self.sigmas_array) if float(s) >= 0]
                    if not valid_indices:
                        result = self.total_steps - 1
                    else:
                        valid_sigmas = [float(self.sigmas_array[i]) for i in valid_indices]
                        diffs = [abs(s - sigma_val) for s in valid_sigmas]
                        min_idx = diffs.index(min(diffs))
                        result = valid_indices[min_idx]
                
                # Не даём шагу повторяться
                if result <= self._last_step_idx:
                    result = self._last_step_idx + 1
                
                self._last_step_idx = min(result, self.total_steps - 1)
                return self._last_step_idx
            
            def predict_noise(self, x, timestep, model_options={}, seed=None):
                current_sigma = float(timestep.mean())
                step_idx = self.find_step_idx(current_sigma)
                
                raw_cfg = self.cfg_calc_func(step_idx, self.total_steps)
                
                if self.hysteresis_enabled and self.previous_cfg is not None:
                    if raw_cfg > self.previous_cfg * self.hysteresis_factor:
                        raw_cfg = self.previous_cfg * self.hysteresis_factor
                    if raw_cfg < self.previous_cfg / self.hysteresis_factor:
                        raw_cfg = self.previous_cfg / self.hysteresis_factor
                    raw_cfg = max(raw_cfg, self.cfg_floor)
                
                self.previous_cfg = raw_cfg
                self.cfg_history.append(float(raw_cfg))
                
                if self.node_id is not None and PromptServer is not None:
                    try:
                        client_id = getattr(PromptServer.instance, 'client_id', None)
                        if client_id is not None:
                            PromptServer.instance.send_sync(
                                "rimor_cfg_update",
                                {"node_id": self.node_id, "cfg_value": float(raw_cfg)},
                                client_id
                            )
                    except:
                        pass
                
                result = comfy.samplers.sampling_function(
                    self.inner_model, x, timestep,
                    self.conds.get("negative", None),
                    self.conds.get("positive", None),
                    raw_cfg,
                    model_options=model_options,
                    seed=seed
                )
                
                if step_idx in self.snap_steps and step_idx not in self.snapshot_latents:
                    self.snapshot_latents[step_idx] = result.clone()
                    log_debug(log_file, f"SNAPSHOT at step {step_idx}")
                
                return result
        
        snap_configs = [
            (snap1_enabled, snap1_step),
            (snap2_enabled, snap2_step),
            (snap3_enabled, snap3_step),
        ]
        
        sigmas_cpu = sigmas.cpu().float()
        
        if unique_id is not None and PromptServer is not None:
            try:
                client_id = getattr(PromptServer.instance, 'client_id', None)
                if client_id is not None:
                    PromptServer.instance.send_sync(
                        "rimor_cfg_reset",
                        {"node_id": str(unique_id)},
                        client_id
                    )
            except:
                pass
        
        guider = CFGSculptorGuider(model, calculate_cfg, total_steps, 
                                    sigmas_cpu, snap_configs,
                                    hysteresis_enabled, hysteresis_factor, cfg_floor, unique_id)
        guider.set_conds(positive, negative)
        
        x0_output = {}
        callback = latent_preview.prepare_callback(model, total_steps, x0_output)
        disable_pbar = not comfy.utils.PROGRESS_BAR_ENABLED
        
        samples = guider.sample(
            noise.generate_noise(latent), latent_image, sampler, sigmas,
            denoise_mask=noise_mask, callback=callback, disable_pbar=disable_pbar, seed=noise.seed
        )
        samples = samples.to(comfy.model_management.intermediate_device())
        
        def decode_latent(latent_tensor):
            if latent_tensor is None:
                return None
            if latent_tensor.is_nested:
                latent_tensor = latent_tensor.unbind()[0]
            images = vae.decode(latent_tensor)
            if len(images.shape) == 5:
                images = images.reshape(-1, images.shape[-3], images.shape[-2], images.shape[-1])
            return images
        
        def create_empty_image(shape):
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
            if len(shape) == 4:
                return torch.zeros(shape[0], 1, 1, 3, device=device)
            return torch.zeros(1, 1, 1, 3, device=device)
        
        final_image = decode_latent(samples)
        
        snap1_img = decode_latent(guider.snapshot_latents.get(snap1_step)) if snap1_enabled else create_empty_image(final_image.shape)
        snap2_img = decode_latent(guider.snapshot_latents.get(snap2_step)) if snap2_enabled else create_empty_image(final_image.shape)
        snap3_img = decode_latent(guider.snapshot_latents.get(snap3_step)) if snap3_enabled else create_empty_image(final_image.shape)
        
        if snap1_enabled and snap1_img is None: snap1_img = final_image
        if snap2_enabled and snap2_img is None: snap2_img = final_image
        if snap3_enabled and snap3_img is None: snap3_img = final_image
        
        caught = list(guider.snapshot_latents.keys())
        log_debug(log_file, f"Snapshots caught: {caught}")
        
        if guider.cfg_history:
            log_debug(log_file, f"CFG range: {min(guider.cfg_history):.3f} - {max(guider.cfg_history):.3f}")
        else:
            log_debug(log_file, "CFG history is empty")
        
        return io.NodeOutput(snap1_img, snap2_img, snap3_img, final_image)

    sample = execute


def calc_envelope(t, mode, start, end):
    floor = min(start, end)
    ceiling = max(start, end)
    
    if mode == "linear":
        result = start + (end - start) * t
    elif mode == "sigmoid":
        k = 6.0
        sig = 1.0 / (1.0 + math.exp(-k * (t - 0.5)))
        result = start + (end - start) * sig
    elif mode == "gaussian":
        sigma = 0.2
        gauss = math.exp(-((t - 0.5) ** 2) / (2 * sigma ** 2))
        result = start + (end - start) * gauss
    elif mode == "rise_fall":
        peak = ceiling + (ceiling - floor) * 0.5
        if t < 0.5:
            result = start + (peak - start) * (t / 0.5)
        else:
            result = peak + (end - peak) * ((t - 0.5) / 0.5)
    elif mode == "fall_rise":
        valley = floor - (ceiling - floor) * 0.5
        if t < 0.5:
            result = start + (valley - start) * (t / 0.5)
        else:
            result = valley + (end - valley) * ((t - 0.5) / 0.5)
    elif mode == "mid_peak":
        mid = start + (end - start) * 0.5
        peak = max(mid, end) + abs(end - start) * 0.3
        if t < 0.6:
            result = mid + (peak - mid) * (t / 0.6)
        else:
            result = peak + (end - peak) * ((t - 0.6) / 0.4)
    elif mode == "mid_valley":
        mid = start + (end - start) * 0.5
        valley = min(mid, end) - abs(end - start) * 0.3
        if t < 0.6:
            result = mid + (valley - mid) * (t / 0.6)
        else:
            result = valley + (end - valley) * ((t - 0.6) / 0.4)
    else:
        result = start
    
    return max(floor, min(result, ceiling))


def calc_fibonacci_envelope(t, start, end, fib_depth=8):
    floor = min(start, end)
    ceiling = max(start, end)
    
    # Гарантируем что t=1.0 даёт end
    if t >= 1.0:
        return end
    
    # Гарантируем что t=0.0 даёт start
    if t <= 0.0:
        return start
    
    fib = [1, 1]
    for _ in range(fib_depth - 2):
        fib.append(fib[-1] + fib[-2])
    
    fib_sum = sum(fib)
    weights = [f / fib_sum for f in fib]
    
    cum_weights = []
    s = 0
    for w in weights:
        s += w
        cum_weights.append(s)
    
    pos = t
    
    idx = 0
    for i, cw in enumerate(cum_weights):
        if pos <= cw:
            idx = i
            break
    
    if idx == 0:
        frac = pos / cum_weights[0] if cum_weights[0] > 0 else 0
        fib_val = frac * weights[0]
    else:
        prev_cw = cum_weights[idx-1]
        curr_cw = cum_weights[idx]
        span = curr_cw - prev_cw
        frac = (pos - prev_cw) / span if span > 0 else 0
        fib_val = weights[idx-1] * (1-frac) + weights[idx] * frac
    
    result = start + (end - start) * fib_val
    
    return max(floor, min(result, ceiling))


def calc_waveform(t, wave_type, periods, amplitude, decay):
    if wave_type == "none" or amplitude == 0:
        return 0.0
    
    phase_norm = t * periods
    
    if wave_type == "sine":
        phase = 2 * math.pi * phase_norm
        wave = amplitude * math.sin(phase)
    elif wave_type == "triangle":
        pos = phase_norm % 1.0
        if pos < 0.25:
            wave = amplitude * (4 * pos)
        elif pos < 0.75:
            wave = amplitude * (2 - 4 * pos)
        else:
            wave = amplitude * (4 * pos - 4)
    elif wave_type == "square":
        pos = phase_norm % 1.0
        wave = amplitude if pos < 0.5 else -amplitude
    elif wave_type == "sawtooth":
        pos = phase_norm % 1.0
        wave = amplitude * (2 * pos - 1)
    elif wave_type == "fibonacci":
        fib_mod = 1 / (1 + 1.618 * math.sin(math.pi * phase_norm) ** 2)
        wave = amplitude * math.sin(math.pi * phase_norm) * fib_mod
    else:
        return 0.0
    
    if decay == "linear":
        wave *= (1 - t)
    elif decay == "exp":
        wave *= math.exp(-3 * t)
    elif decay == "fibonacci":
        wave *= 1 / (1 + 1.618 * (1 - t) ** 2)
    
    return wave