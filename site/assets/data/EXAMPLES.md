# Filling the dynamic sections

Each page below reads one JSON file. While the file is `[]` the page shows a
"coming soon" message. Add entries (one object per item) and redeploy.

## qualifications.json  (/qcto/qualifications/)
[
  { "title": "Occupational Certificate: ...", "id": "000000", "nqf": "4", "credits": "120",
    "status": "Accredited", "sector": "Services", "occupation": "...",
    "summary": "One or two sentences.", "duration": "12 months" }
]

## team.json  (/about/team/)
[
  { "name": "Full Name", "role": "Job title", "expertise": "Short area of expertise",
    "photo": "/assets/img/team/full-name.jpg", "linkedin": "https://www.linkedin.com/in/..." }
]

## articles.json  (/resources/)  category must match one of the nine chips
[
  { "title": "Headline", "date": "13 October 2026", "category": "QCTO",
    "summary": "Short summary.", "url": "/resources/your-article/" }
]

## stories.json  (/case-studies/)
[
  { "type": "Employer case study", "title": "Headline", "summary": "Short summary.", "url": "" }
]
