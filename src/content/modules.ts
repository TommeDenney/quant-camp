import type { Module } from './types';

// The fourteen modules, in study order. Monday: foundations and inference;
// Tuesday: time series and modelling; Wednesday: rapid recall and the final practice.
export const MODULES: Module[] = [
  { id: 0, title: 'Statistics Foundations', day: 'mon', blurb: 'The vocabulary and symbols everything else is written in.', lessons: [] },
  { id: 1, title: 'Describing Data', day: 'mon', blurb: 'Mean, spread, skewness, kurtosis and quantiles.', lessons: [] },
  { id: 2, title: 'Probability & Distributions', day: 'mon', blurb: 'PDFs, CDFs, exceedance, return periods and Bayes.', lessons: [] },
  { id: 3, title: 'Hypothesis Testing', day: 'mon', blurb: 'Nulls, p-values, errors, power and confidence intervals.', lessons: [] },
  { id: 4, title: 'Choosing a Test', day: 'mon', blurb: 't, Welch, F, rank-sum, Kruskal–Wallis, KS, Pearson, Spearman.', lessons: [] },
  { id: 5, title: 'Permutation & Bootstrap', day: 'mon', blurb: 'Resampling to test hypotheses and measure uncertainty.', lessons: [] },
  { id: 6, title: 'Time-Series Foundations', day: 'tue', blurb: 'Stationarity, autocorrelation and effective sample size.', lessons: [] },
  { id: 7, title: 'Autoregressive Models', day: 'tue', blurb: 'AR(1) persistence, forecasts and their uncertainty.', lessons: [] },
  { id: 8, title: 'Filtering, Trends & Seasonality', day: 'tue', blurb: 'Running means, warming rates and anomalies.', lessons: [] },
  { id: 9, title: 'Spectral & Harmonic Analysis', day: 'tue', blurb: 'Frequencies, Nyquist, aliasing and the periodogram.', lessons: [] },
  { id: 10, title: 'Regression Foundations', day: 'tue', blurb: 'Least squares, residuals, R² and RMSE.', lessons: [] },
  { id: 11, title: 'Model Selection & Validation', day: 'tue', blurb: 'Overfitting, cross-validation and leakage.', lessons: [] },
  { id: 12, title: 'Detection & Attribution', day: 'tue', blurb: 'Fingerprints, scaling factors and their confidence intervals.', lessons: [] },
  { id: 13, title: 'Final Integrated Practice', day: 'wed', blurb: 'Mixed scenarios that combine everything.', lessons: [] },
];
