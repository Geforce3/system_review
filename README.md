# PubMed Systematic Review Assistant

A browser-based tool for conducting systematic literature reviews using PubMed. This single-page application helps researchers search, screen, export, and synthesise academic papers with AI-assisted decision support.

## Features

- **Stage 1 - Search**: Fetch papers from PubMed using any search query
- **Stage 2 - AI Screening**: Use Claude to automatically screen papers based on inclusion/exclusion criteria
- **Stage 3 - Export**: Download results as CSV with decisions and reasons
- **Stage 4 - Synthesis**: Generate structured evidence synthesis from included papers

## How to Use

1. Open `index.html` in your web browser
2. Enter your PubMed search query (e.g., a complex boolean query you would use on PubMed)
3. Set the maximum number of results (up to 500)
4. Enter your Claude API key (get one at [console.anthropic.com](https://console.anthropic.com))
5. Click **Search PubMed** — results will load and screening criteria will be auto-generated
6. Review and edit the suggested criteria in Stage 2 if needed
7. Click **Screen All Papers with AI** to begin automated screening
8. Review decisions — click any badge to manually override (Include/Exclude/Uncertain)
9. In Stage 3, click **Download CSV** to export results
10. In Stage 4, click **Synthesise Included Papers** to generate an evidence synthesis

## Requirements

- A **Claude API key** from [console.anthropic.com](https://console.anthropic.com) (free tier available)
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No installation required — just open the HTML file

## Technical Details

- **Tech Stack**: Plain HTML, CSS, and JavaScript — no frameworks, no dependencies
- **PubMed Integration**: Uses NCBI E-utilities API (free, no API key required)
- **AI Integration**: Claude API with direct browser requests
- **Privacy**: Your API key is stored in memory only and never saved or transmitted anywhere except to Anthropic's API

## Disclaimer

AI screening is assistive only. All screening decisions should be verified by the researcher. The tool is designed to support the systematic review process, not replace expert judgment.
