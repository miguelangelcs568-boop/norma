import { nid, useDesk } from "./store";
import type { Trace } from "./types";

export function pushGeneral(trace: Omit<Trace, "id">) {
  useDesk.setState((state) => ({
    project: {
      ...state.project,
      trace: [...(state.project.trace ?? []), { ...trace, id: nid() }].slice(-48),
    },
  }));
}
