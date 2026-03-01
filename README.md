# TS-PHOL Strategy Workbench

## What problem this solves
Adversarial Reasoning (AR) systems often face a tradeoff between **expressiveness** (how complex the rules can be) and **tractability** (how fast the system can reason). Standard Higher-Order Logics are often undecidable or exponential in complexity.

**TS-PHOL** (Tractable Stratified Probabilistic Higher-Order Logic) solves this by:
1. **Enforcing PTIME Complexity**: Using a restricted logical fragment that guarantees polynomial-time inference.
2. **Neuro-Symbolic Composition**: Seamlessly combining low-level Machine Learning (ML) probabilistic signals with high-level symbolic rules.
3. **Machine-Checkable Proofs**: Generating structured, low-burden logical explanations for every decision, ensuring human trust and auditability.

## 5-Minute Walkthrough
1. **Configure Scenario**: Go to the **Scenario** tab. Adjust the number of zones or edit specific zone parameters (units, supply, fog) by clicking on the map cards.
2. **Inspect ML Signals**: Switch to the **ML Signals** tab to see raw probability predictions from the neural layer.
3. **Run Inference**: Click the **Run Inference** button in the header. Watch the progress bar as the system moves from World State to Final Decision.
4. **Inspect Proof**: Go to the **Proof** tab. Select a decision to see its derivation tree. Hover over nodes to see which map zones triggered specific rules.
5. **What-If Analysis**: In the **Inference** tab, adjust the `p_attack` threshold slider to see how the AI's tactical recommendation changes under different risk tolerances.

## Glossary
- **Stratum**: A logical layer in the reasoning hierarchy. Higher strata depend on lower ones, preventing cycles and ensuring tractability.
- **Grounded Fact**: A concrete instance of a predicate where variables are replaced by actual entities (e.g., `Vulnerable(Zone_1)`).
- **PTIME**: Polynomial Time. A complexity class ensuring the system remains fast even as the problem space (number of zones) grows.
- **Range Restriction**: A safety property ensuring every variable in a rule's head also appears in its body, preventing the creation of infinite new entities.

## Maintainability
The project is split into:
- `src/engine/tsphol.ts`: Core inference and validation logic.
- `src/hooks/useInference.ts`: State management and inference orchestration.
- `src/components/`: Reusable UI components (Map, Decision Card, Onboarding).
- `src/types.ts`: Centralized type definitions.
