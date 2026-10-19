// The registry of interactive simulators: lessons refer to them by VizId.
import type { ComponentType } from 'react';
import type { VizId } from '../content/types';
import AcfLab from './acf';
import Ar1Sim from './ar1';
import AttributionSim from './attribution';
import BayesTree from './bayes';
import BootstrapSim from './bootstrap';
import CrossValLab from './crossval';
import DistributionExplorer from './distribution';
import FilteringLab from './filtering';
import MomentsPlayground from './moments';
import PdfCdfExplorer from './pdfcdf';
import PermutationSim from './permutation';
import RegressionPlayground from './regression';
import SpectralLab from './spectral';
import TailVisualizer from './tails';
import TestPicker from './testpicker';

export interface VizMeta { id: VizId; title: string; blurb: string; module: number; C: ComponentType<{ preset?: string }> }

export const VIZ: VizMeta[] = [
  { id: 'distribution', title: 'Distribution Explorer', blurb: 'Shape, skewness and heavy tails against a Gaussian.', module: 1, C: DistributionExplorer },
  { id: 'moments', title: 'Moments Playground', blurb: 'Why one extreme day moves skewness and kurtosis so much.', module: 1, C: MomentsPlayground },
  { id: 'pdfcdf', title: 'PDF / CDF / Return Period', blurb: 'Exceedance probability, survival function and return periods.', module: 2, C: PdfCdfExplorer },
  { id: 'bayes', title: 'Bayes Tree', blurb: 'Joint, marginal and conditional probability from counts.', module: 2, C: BayesTree },
  { id: 'tails', title: 'p-value & Tails', blurb: 'One- and two-sided tests, critical values and decisions.', module: 3, C: TailVisualizer },
  { id: 'testpicker', title: 'Which Test?', blurb: 'A decision tree and scenario practice for choosing a test.', module: 4, C: TestPicker },
  { id: 'permutation', title: 'Permutation Test', blurb: 'Shuffle the labels and build the null distribution.', module: 5, C: PermutationSim },
  { id: 'bootstrap', title: 'Bootstrap', blurb: 'Resample with replacement to get a confidence interval.', module: 5, C: BootstrapSim },
  { id: 'acf', title: 'Autocorrelation Lab', blurb: 'ACF, the ±1.96/√N band and effective sample size.', module: 6, C: AcfLab },
  { id: 'ar1', title: 'AR(1) Simulator', blurb: 'Persistence, forecasts and growing uncertainty.', module: 7, C: Ar1Sim },
  { id: 'filtering', title: 'Filtering & Trends', blurb: 'Running means, anomalies and an honest warming rate.', module: 8, C: FilteringLab },
  { id: 'spectral', title: 'Spectral Lab', blurb: 'Harmonics, the periodogram, Nyquist and aliasing.', module: 9, C: SpectralLab },
  { id: 'regression', title: 'Regression Playground', blurb: 'Drag points; compare fits, residuals, R² and RMSE.', module: 10, C: RegressionPlayground },
  { id: 'crossval', title: 'Cross-Validation Lab', blurb: 'Training vs out-of-sample skill, overfitting and leakage.', module: 11, C: CrossValLab },
  { id: 'attribution', title: 'Attribution Simulator', blurb: 'Scaling factors: detected? consistent with models?', module: 12, C: AttributionSim },
];
export const vizMeta = (id: string) => VIZ.find((v) => v.id === id);

/** Render a simulator by id. Unknown ids render a small notice instead of crashing. */
export default function Viz({ id = 'distribution', preset }: { id?: VizId | string; preset?: string }) {
  const m = vizMeta(id);
  if (!m) return <div className="card card-pad text-sm text-muted">This interactive ({id}) isn't available.</div>;
  return <m.C key={`${id}:${preset || ''}`} preset={preset} />;
}
export { Viz };
