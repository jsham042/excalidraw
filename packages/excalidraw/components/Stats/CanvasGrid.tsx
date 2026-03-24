import { GRID_STYLES } from "@excalidraw/common";

import type { GridStyle } from "@excalidraw/common";
import type { Scene } from "@excalidraw/element";

import { getNormalizedGridStep } from "../../scene";
import { RadioGroup } from "../RadioGroup";
import { gridLinesIcon, gridDotsIcon, gridCrossIcon } from "../icons";

import StatsDragInput from "./DragInput";
import { getStepSizedValue } from "./utils";

import type { AppState } from "../../types";

interface PositionProps {
  property: "gridStep";
  scene: Scene;
  appState: AppState;
  setAppState: React.Component<any, AppState>["setState"];
}

const STEP_SIZE = 5;

const gridStyleChoices: {
  value: GridStyle;
  label: React.ReactNode;
  ariaLabel: string;
}[] = [
  {
    value: GRID_STYLES.LINES,
    label: gridLinesIcon,
    ariaLabel: "Lines grid",
  },
  {
    value: GRID_STYLES.DOTS,
    label: gridDotsIcon,
    ariaLabel: "Dots grid",
  },
  {
    value: GRID_STYLES.CROSS,
    label: gridCrossIcon,
    ariaLabel: "Cross grid",
  },
];

const CanvasGrid = ({
  property,
  scene,
  appState,
  setAppState,
}: PositionProps) => {
  return (
    <>
      <StatsDragInput
        label="Grid step"
        sensitivity={8}
        elements={[]}
        dragInputCallback={({
          nextValue,
          instantChange,
          shouldChangeByStepSize,
          setInputValue,
        }) => {
          setAppState((state) => {
            let nextGridStep;

            if (nextValue) {
              nextGridStep = nextValue;
            } else if (instantChange) {
              nextGridStep = shouldChangeByStepSize
                ? getStepSizedValue(
                    state.gridStep + STEP_SIZE * Math.sign(instantChange),
                    STEP_SIZE,
                  )
                : state.gridStep + instantChange;
            }

            if (!nextGridStep) {
              setInputValue(state.gridStep);
              return null;
            }

            nextGridStep = getNormalizedGridStep(nextGridStep);
            setInputValue(nextGridStep);
            return {
              gridStep: nextGridStep,
            };
          });
        }}
        scene={scene}
        value={appState.gridStep}
        property={property}
        appState={appState}
      />
      <div style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
        <RadioGroup
          choices={gridStyleChoices}
          value={appState.gridStyle}
          onChange={(value) => {
            setAppState({ gridStyle: value });
          }}
          name="gridStyle"
        />
      </div>
    </>
  );
};

export default CanvasGrid;
