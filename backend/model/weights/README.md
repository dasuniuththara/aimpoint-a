# Linking Your Kaggle Model to AimPointAI

This directory (`backend/model/weights/`) is where your trained machine learning model from Kaggle is loaded into the AimPointAI inference engine.

---

## How to Export from Kaggle

Inside your Kaggle notebook (`https://www.kaggle.com/code/dasuniuththara/basketball-project`), add this export cell at the end of training:

### Option A: NumPy Weight Export (Recommended - Fast & Zero Dependencies)
Run this in a cell in Kaggle:
```python
import numpy as np

# If you trained a PyTorch model:
weights_dict = {
    name: param.detach().cpu().numpy()
    for name, param in model.named_parameters()
}
np.savez_compressed("best_model.npz", **weights_dict)
print("Model exported to /kaggle/working/best_model.npz")
```

### Option B: PyTorch State Dict Export
```python
import torch

torch.save(model.state_dict(), "best_model.pth")
print("Saved PyTorch weights to /kaggle/working/best_model.pth")
```

---

## How to Link It to Your App

1. In your Kaggle notebook, open the right sidebar under **Output** (`/kaggle/working/`).
2. Click **Download** on `best_model.npz` (or `best_model.pth`).
3. Move the downloaded file into this folder:
   ```
   backend/model/weights/best_model.npz
   ```
4. Restart the backend (`python start_server.py` or double-click `AimPointAI-Desktop.bat`).
5. The system will automatically detect and link your Kaggle model weights!
