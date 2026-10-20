export interface ColabStep {
  id: string;
  title: string;
  instructions: string;
  code?: string;
  output?: string;
  tryIt: string;
}

// Supplemental notebook guidance; course statistics remain sourced in the lessons.
export const COLAB_STEPS: ColabStep[] = [
  {
    id: 'open', title: '1. Open your study notebook',
    instructions: 'Open Google Colab and use your existing notebook, or create a new one. Give it a useful name such as Quant Camp practice. A notebook mixes **text cells** (your explanation) and **code cells** (Python). Keep the problem, your prediction, the code and your interpretation together.',
    tryIt: 'Add a text cell headed “What does a sample mean tell me?” and write your prediction before running any code.',
  },
  {
    id: 'run', title: '2. Run a code cell',
    instructions: 'Add a code cell, paste this example, then press the play button to its left or **Shift + Enter**. Connect to a runtime if Colab asks. The result appears below the cell. These small statistics examples use a standard CPU runtime.',
    code: 'temperatures = [30, 32, 31, 35, 32]\nmean_temp = sum(temperatures) / len(temperatures)\nprint(f"Mean temperature: {mean_temp:.1f} C")',
    output: 'Mean temperature: 32.0 C',
    tryIt: 'Change 35 to 40, predict the new mean, and run the cell again. The output changes only after you run it.',
  },
  {
    id: 'order', title: '3. Run cells in order',
    instructions: 'A variable is a named value stored in the current runtime. This cell uses the temperatures variable from the previous cell. Run the definition first. Moving a cell does not undo its earlier execution. For a clean check, restart the session and run all cells from the top.',
    code: 'deviations = [t - mean_temp for t in temperatures]\nprint(deviations)\nprint(f"Sum of deviations: {sum(deviations):.1f}")',
    output: '[-2.0, 0.0, -1.0, 3.0, 0.0]\nSum of deviations: 0.0',
    tryIt: 'Use the original temperatures from step 2 to match this output. If you get NameError, rerun the cell that defines temperatures and mean_temp.',
  },
  {
    id: 'libraries', title: '4. Use NumPy and SciPy',
    instructions: 'Imports make a library available in your notebook. **np** is the usual short name for NumPy, and **stats** is SciPy’s statistics module. This example is self-contained: it imports its libraries and defines its own data. If a course library is missing, install it in a separate cell with `%pip install numpy scipy pandas matplotlib statsmodels`, then rerun the imports.',
    code: 'import numpy as np\nfrom scipy import stats\nx = np.array([30, 32, 31, 35, 32], dtype=float)\nprint(f"Mean: {np.mean(x):.1f}")\nprint(f"Sample variance: {np.var(x, ddof=1):.1f}")',
    output: 'Mean: 32.0\nSample variance: 3.5',
    tryIt: 'Replace ddof=1 with ddof=0. Which denominator changed? Write the distinction between a sample variance and NumPy’s default variance in a text cell.',
  },
  {
    id: 'plot', title: '5. Make a plot and explain it',
    instructions: 'A plot helps you check what your calculations hide. This code draws the observations and their sample mean. The x-axis is a position in this toy sample; it is not a claim about a temperature trend.',
    code: 'import numpy as np\nimport matplotlib.pyplot as plt\nx = np.array([30, 32, 31, 35, 32])\nplt.plot(np.arange(1, len(x) + 1), x, "o-", label="Daily high")\nplt.axhline(x.mean(), color="tab:orange", label="Sample mean")\nplt.xlabel("Observation")\nplt.ylabel("Temperature (C)")\nplt.legend()\nplt.show()',
    output: 'A five-point line plot with a horizontal mean line at 32 C.',
    tryIt: 'Add a text cell: “The largest observation pulls the mean upward. This plot alone does not establish a warming trend.” Then change one value and inspect both the plot and the mean.',
  },
  {
    id: 'upload', title: '6. Upload and inspect a CSV',
    instructions: 'Use the quant-camp-practice.csv file downloaded with this guide. In Colab, run this cell and choose that file. Uploads are stored in the runtime, so you may need to upload again after a reset. Inspect the column names, units and missing values before running a test. Use only course files you are allowed to upload.',
    code: 'import io\nimport pandas as pd\nfrom google.colab import files\nuploaded = files.upload()\nfilename = next(iter(uploaded))\ndf = pd.read_csv(io.BytesIO(uploaded[filename]))\nprint(df.to_string(index=False))\nprint("Missing temperatures:", df["temperature_c"].isna().sum())',
    output: '       date  temperature_c\n2026-07-01             30\n2026-07-02             32\n2026-07-03             31\n2026-07-04             35\n2026-07-05             32\nMissing temperatures: 0',
    tryIt: 'In a new cell, run df["temperature_c"].mean(). If you see KeyError, print df.columns and check spelling and spaces. A CSV is data; an .ipynb file is a notebook.',
  },
  {
    id: 'interpret', title: '7. Read a test result',
    instructions: 'A result needs a question and assumptions. Here the null is that the population mean is 30 C. Treat these synthetic observations as independent and approximately normally distributed for this exercise. Actual consecutive daily temperatures often violate independence; check persistence before using an ordinary t-test.',
    code: 'import numpy as np\nfrom scipy import stats\nx = np.array([30, 32, 31, 35, 32], dtype=float)\nresult = stats.ttest_1samp(x, popmean=30)\nprint(f"t = {result.statistic:.3f}")\nprint("Reject H0 at 5%:", bool(result.pvalue < 0.05))',
    output: 't = 2.390\nReject H0 at 5%: False',
    tryIt: 'Write: “At the 5% level, this small synthetic sample does not provide sufficient evidence to reject a mean of 30 C. This does not prove the mean is 30 C.” Then inspect result.pvalue.',
  },
  {
    id: 'save', title: '8. Save and reopen your work',
    instructions: 'Keep your own notebook in Google Drive and check its save status before closing it. To use a Quant Camp download, choose **Upload notebook** from Colab’s File menu and select the .ipynb file. You can download your notebook from the File menu too. A saved notebook and its runtime are different: variables and uploaded files can disappear when the runtime is deleted. Rerun imports and definitions, and upload files again.',
    tryIt: 'Download this starter notebook, open it in Colab, and run it from the top through the upload step. Select the practice CSV when prompted, then continue to the test. Save a copy with your own interpretation under each result.',
  },
];

export const PRACTICE_CSV = 'date,temperature_c\n2026-07-01,30\n2026-07-02,32\n2026-07-03,31\n2026-07-04,35\n2026-07-05,32\n';

export const COLAB_HELP = [
  { problem: 'NameError: a variable is not defined', fix: 'Run the cell that defines it, then rerun the dependent cell. After reconnecting to a fresh runtime, run from the top.' },
  { problem: 'ModuleNotFoundError', fix: 'Install the named course library with %pip in a code cell, then rerun the import. Check spelling first.' },
  { problem: 'FileNotFoundError', fix: 'Upload the file into this runtime again. A file on your Mac is not automatically a file in Colab.' },
  { problem: 'KeyError when selecting a CSV column', fix: 'Print df.columns and use the exact name. Check spaces, capital letters and whether you uploaded the expected file.' },
  { problem: 'Output looks stale or inconsistent', fix: 'Rerun the cell after editing. Restart the session and run from the top if earlier values were executed out of order.' },
  { problem: 'The result differs from the example', fix: 'Check the data, ddof, units, test direction, equal_var option and random seed. Explain any difference before trusting the conclusion.' },
];
