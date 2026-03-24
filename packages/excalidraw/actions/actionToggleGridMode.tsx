import { CODES, KEYS } from "@excalidraw/common";

import { CaptureUpdateAction } from "@excalidraw/element";

import { gridIcon, gridBackgroundIcon } from "../components/icons";

import { register } from "./register";

import type { AppState } from "../types";

export const actionToggleGridMode = register({
  name: "gridMode",
  icon: gridIcon,
  keywords: ["snap"],
  label: "labels.toggleGrid",
  viewMode: true,
  trackEvent: {
    category: "canvas",
    predicate: (appState) => appState.gridModeEnabled,
  },
  perform(elements, appState) {
    return {
      appState: {
        ...appState,
        gridModeEnabled: !this.checked!(appState),
        objectsSnapModeEnabled: false,
      },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
  checked: (appState: AppState) => appState.gridModeEnabled,
  predicate: (element, appState, props) => {
    return props.gridModeEnabled === undefined;
  },
  keyTest: (event) => event[KEYS.CTRL_OR_CMD] && event.code === CODES.QUOTE,
});

export const actionToggleGridBackground = register({
  name: "gridBackground",
  icon: gridBackgroundIcon,
  keywords: ["grid", "background", "graph", "paper", "notebook"],
  label: "labels.toggleGridBackground",
  viewMode: true,
  trackEvent: {
    category: "canvas",
    predicate: (appState) => appState.gridBackground,
  },
  perform(elements, appState) {
    return {
      appState: {
        ...appState,
        gridBackground: !this.checked!(appState),
      },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
  checked: (appState: AppState) => appState.gridBackground,
  predicate: (_element, appState) => appState.gridModeEnabled,
});
