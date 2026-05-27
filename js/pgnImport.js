const PgnImport = (() => {
  function init(inputElement) {
    inputElement.addEventListener("change", handleFileSelection);
  }

  async function handleFileSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    const text = await file.text();
    alert("PGN imported. Parser connection will be added in the next step. File size: " + text.length + " characters.");
  }

  return {
    init
  };
})();
