const TreeRenderer = (() => {
  let canvas = null;
  let svg = null;
  let selectedMove = null;
  let selectedPath = null;
  let selectedNodeId = "start";
  let currentTree = null;
  let allNodes = [];
  let parentMap = new Map();

  function init(options) {
    canvas = options.canvas;
    svg = options.svg;
    selectedMove = options.selectedMove;
    selectedPath = options.selectedPath;
  }

  function render(tree) {
    currentTree = tree;
    canvas.querySelectorAll(".node").forEach(node => node.remove());
    svg.innerHTML = "";
    allNodes = [];
    parentMap = new Map();

    walk(tree, null, node => {
      allNodes.push(node);
      createNode(node);
    });

    walk(tree, null, (node, parent) => {
      if (parent) {
        parentMap.set(node.id, parent);
        drawLine(parent, node, node.type === "main" ? "main-line" : "variation-line");
      }
    });
  }

  function resetSelection() {
    selectedNodeId = "start";
    selectedMove.textContent = "Start";
    selectedPath.textContent = "Click a move node to inspect the path.";
  }

  function walk(node, parent, callback) {
    callback(node, parent);
    node.children.forEach(child => walk(child, node, callback));
  }

  function createNode(node) {
    const div = document.createElement("div");
    div.className = `node ${node.type}`;
    if (node.id === selectedNodeId) div.classList.add("selected");
    div.style.left = `${node.x}px`;
    div.style.top = `${node.y}px`;
    div.textContent = node.move;
    div.addEventListener("click", () => selectNode(node.id));
    canvas.appendChild(div);
  }

  function drawLine(from, to, className) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y - 18);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y + 18);
    line.setAttribute("class", className);
    svg.appendChild(line);
  }

  function selectNode(id) {
    selectedNodeId = id;
    const node = allNodes.find(item => item.id === id);
    selectedMove.textContent = node ? node.move : "Start";
    selectedPath.textContent = buildPath(id).join(" → ");
    render(currentTree);
  }

  function buildPath(id) {
    const path = [];
    let currentId = id;

    while (currentId) {
      const node = allNodes.find(item => item.id === currentId);
      if (node) path.unshift(node.move);

      const parent = parentMap.get(currentId);
      currentId = parent ? parent.id : null;
    }

    return path;
  }

  return {
    init,
    render,
    resetSelection
  };
})();
