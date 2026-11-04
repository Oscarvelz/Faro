import { installSampleMode } from "./samplemode";

// Imported first by the app entry, so no module reads Faro data before sample mode is known.
installSampleMode();
