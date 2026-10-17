---
title: KrishiSetu API
emoji: 🌾
colorFrom: green
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

# KrishiSetu API

FastAPI backend for KrishiSetu: crop recommendation, leaf disease detection,
weather and mandi price forecasting (Agmarknet + district rainfall).

Interactive docs: `/docs`

Environment variables / secrets:

| Name | Needed for |
| --- | --- |
| `GEMINI_API_KEY` | Plant name from a leaf photo |
| `DATA_GOV_API_KEY` | Daily Agmarknet price updates |
