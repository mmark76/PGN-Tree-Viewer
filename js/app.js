const App = (() => {
  const maximumVariationCount = 40;

  let canvas = null;
  let subtitle = null;
  let variationButton = null;
  let currentVariationCount = 8;

  function init() {
    canvas = document.getElementById("treeCanvas");
    subtitle = document.getElementById("subtitle");
    variationButton = document.getElementById("variationButton");

    TreeRenderer.init({
      canvas,
      svg: document.getElementById("lines"),
      selectedMove: document.getElementById("selectedMove"),
      selectedPath: document.getElementById("selectedPath")
    });

    PgnImport.init(document.getElementById("pgnInput"));

    variationButton.addEventListener("click", () => {
      resetTree(askForVariationCount());
    });

    document.getElementById("feedbackButton")?.addEventListener("click", () => {
      window.location.href = "mailto:markellos.markides@gmail.com?subject=PGN%20Tree%20Viewer%20Feedback";
    });

    resetTree(askForVariationCount());
  }

  function askForVariationCount(defaultValue = currentVariationCount) {
    const answer = prompt("How many variations should be created?", String(defaultValue));
    const parsedValue = Number.parseInt(answer, 10);

    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      alert("Please enter a valid number of variations.");
      return defaultValue;
    }

    return Math.min(parsedValue, maximumVariationCount);
  }

  function resetTree(variationCount) {
    currentVariationCount = variationCount;
    canvas.style.minWidth = `${TreeData.getCanvasWidth(variationCount)}px`;
    subtitle.textContent = `Root at the bottom. Main trunk upward. ${variationCount} variation${variationCount === 1 ? "" : "s"} generated dynamically.`;

    TreeRenderer.resetSelection();
    TreeRenderer.render(TreeData.buildSampleTree(variationCount));
  }

  return {
    init
  };
})();

document.addEventListener("DOMContentLoaded", App.init);
