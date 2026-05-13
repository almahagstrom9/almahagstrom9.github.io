# Social Disconnection Atlas

## Project Overview

The **Social Disconnection Atlas** is an interactive data visualization project that explores patterns of loneliness and social disconnection across the United States throughout 2024. The project combines narrative storytelling, choropleth mapping, trend analysis, and radar-style “disconnection fingerprints” to help users understand how social connection varies geographically and over time.

Live Site: https://almahagstrom9.github.io/atlas.html

The project was designed as an exploratory visual experience rather than a text-heavy article. Users can interact with multiple linked visualizations to investigate indicators such as:

- Loneliness
- Emotional support
- Religious participation
- Community involvement
- Communication frequency
- Social interaction with friends and relatives

The visualization emphasizes that social disconnection is multidimensional and unevenly distributed across different states and communities.

---

# Project Goals

The main goals of this project were to:

1. Create an engaging interactive visualization experience around a complex social issue.
2. Help users compare patterns of social disconnection across states.
3. Demonstrate how loneliness is connected to broader social behaviors and institutions.
4. Combine storytelling with exploratory interaction.
5. Use coordinated multiple views to support deeper understanding.

---

# Features

## Interactive Choropleth Map

The atlas includes a U.S. choropleth map that allows users to:

- Compare states visually
- Switch between social disconnection indicators
- Explore changing patterns over time
- Hover for detailed values
- Select states for deeper analysis

---

## Trend Visualization

The trend chart compares selected states against national averages over time, allowing users to observe shifts throughout 2024.

Features include:
- Hover tooltips
- Animated line transitions
- National vs. state comparisons
- Dynamic updates based on selected indicators

---

## Disconnection Fingerprint (Radar Chart)

The “fingerprint” visualization compares multiple dimensions of social disconnection simultaneously using a radar chart.

This allows users to:
- Compare states holistically
- Identify uneven social patterns
- Explore multidimensional social withdrawal

---

## Narrative Article Experience

The project also includes a scrollytelling-style article that introduces the issue and embeds interactive visualizations directly into the story.

---

# Dataset

Dataset used:
- `Lack_of_Social_Connection_20260429.csv`

The dataset contains national and state-level measures related to:
- Loneliness
- Emotional support
- Religious attendance
- Club participation
- Social communication frequency
- Social interaction levels

---

# Technologies Used

- HTML5
- CSS3
- JavaScript
- D3.js
- TopoJSON
- Google Fonts

External libraries:
- D3 v7
- TopoJSON Client v3

---

# Design Process

## 1. Topic Selection

The team chose social disconnection and loneliness because:
- It is socially relevant and timely.
- It combines geographic, emotional, and behavioral dimensions.
- It benefits from interactive exploratory visualization.

The group wanted to move beyond a single loneliness metric and instead show how multiple forms of social withdrawal interact.

---

## 2. Data Exploration

The dataset was cleaned and normalized to:
- Standardize state names
- Parse dates and time periods
- Separate national and state-level observations
- Support dynamic filtering

The team experimented with multiple possible indicators before selecting the final set of dimensions used in the atlas.

---

## 3. Visualization Design

Several visualization approaches were considered:
- Static maps
- Small multiples
- Scatterplots
- Heatmaps

The final system used coordinated views because they:
- Supported comparison across states
- Allowed exploration over time
- Balanced storytelling with interactivity

The final interface combined:
- Choropleth mapping
- Line charts
- Radar charts
- Narrative article sections

---

## 4. Interaction Design

The project emphasizes exploratory interaction through:
- Hover tooltips
- Dynamic filtering
- Time sliders
- State selection
- Coordinated updates between charts

The team focused heavily on usability and minimizing visual clutter.

---

## 5. Styling and Layout

The visual design aimed for:
- Clean editorial presentation
- Readable typography
- Minimal distractions
- Responsive layouts
- Consistent interaction behavior

---

# Challenges

Some major challenges included:

- Coordinating multiple linked visualizations
- Maintaining consistent state across interactions
- Handling responsive SVG rendering
- Designing radar chart scaling
- Cleaning inconsistent geographic data
- Balancing storytelling with exploration

---

# Key Takeaways

Through this project, the team learned:
- How to structure coordinated multiple-view visualizations
- Advanced D3 interaction patterns
- Responsive visualization design
- Narrative visualization techniques
- Data cleaning and normalization workflows
- User-centered interaction design

---

# Equal Contribution Breakdown

All team members contributed equally to the overall project development, design process, implementation, debugging, testing, and presentation preparation.

## Alma Hagstrom
- Developed choropleth map interactions
- Implemented tooltip systems
- Assisted with narrative article integration
- Participated in styling and UI refinement
- Helped debug coordinated interactions

## Bhargavi
- Worked on trend chart implementation
- Assisted with dataset cleaning and preprocessing
- Contributed to interaction design decisions
- Helped refine chart animations and transitions
- Participated in testing and debugging

## Lauren
- Developed radar chart (“disconnection fingerprint”)
- Worked on layout organization and responsive structure
- Assisted with visual styling and accessibility improvements
- Helped integrate article storytelling sections
- Participated in final deployment and polishing

### Collaboration Notes

All members:
- Participated equally in brainstorming and project planning
- Reviewed and tested each component collaboratively
- Contributed to debugging and interface refinement
- Helped prepare the final presentation/demo

The project was completed collaboratively with an intentionally balanced workload across all phases of development.

---

# File Structure

```text
project/
│
├── index.html
├── atlas.html
├── styles.css
├── script.js
├── article-map.js
├── data/
│   └── Lack_of_Social_Connection_20260429.csv
│
└── README.md