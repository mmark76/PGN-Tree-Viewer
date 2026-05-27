const TreeData = (() => {
  const centerX = 520;
  const branchStartY = 390;
  const verticalGap = 78;
  const variationGap = 120;
  const minimumCanvasWidth = 1040;

  function buildSampleTree(variationCount) {
    const branches = [mainLine(), ...createVariations(variationCount)];

    return {
      id: "start",
      move: "Start",
      type: "start",
      x: centerX,
      y: 660,
      children: [
        {
          id: "m1",
          move: "1.e4",
          type: "main",
          x: centerX,
          y: 570,
          children: [
            {
              id: "m2",
              move: "1...c5",
              type: "main",
              x: centerX,
              y: 480,
              children: branches
            }
          ]
        }
      ]
    };
  }

  function mainLine() {
    return chain("main", centerX, branchStartY, ["2.Nf3", "2...d6", "3.d4", "3...cxd4", "4.Nxd4"], "main");
  }

  function createVariations(count) {
    const variations = [];

    for (let i = 1; i <= count; i++) {
      const x = getVariationX(i, count);
      variations.push(variation(`v${i}`, x, createVariationMoves(i)));
    }

    return variations;
  }

  function getVariationX(index, total) {
    const middle = (total + 1) / 2;
    const offset = index - middle;
    return centerX + offset * variationGap;
  }

  function createVariationMoves(index) {
    const templates = [
      ["2.Nf3", "2...e6", "3.d4"],
      ["2.g3", "2...d6", "3.Bg2"],
      ["2.d4", "2...Nf6", "3.c4"],
      ["2.c3", "2...e6", "3.d4"],
      ["2.Nc3", "2...Nc6", "3.d4"],
      ["2.Bc4", "2...e5", "3.d3"],
      ["2.f4", "2...exf4", "3.Bc4"],
      ["2.b3", "2...b6", "3.Bb2"]
    ];

    return templates[(index - 1) % templates.length];
  }

  function variation(idPrefix, x, moves) {
    return chain(idPrefix, x, branchStartY, moves, "variation");
  }

  function chain(idPrefix, x, startY, moves, type) {
    const root = {
      id: `${idPrefix}-0`,
      move: moves[0],
      type,
      x,
      y: startY,
      children: []
    };

    let current = root;
    for (let i = 1; i < moves.length; i++) {
      const next = {
        id: `${idPrefix}-${i}`,
        move: moves[i],
        type,
        x,
        y: startY - i * verticalGap,
        children: []
      };
      current.children.push(next);
      current = next;
    }

    if (type === "variation") {
      current.children.push({
        id: `${idPrefix}-label`,
        move: labelFromPrefix(idPrefix),
        type: "variation",
        x,
        y: startY - moves.length * verticalGap,
        children: []
      });
    }

    return root;
  }

  function labelFromPrefix(prefix) {
    return `Var ${prefix.replace("v", "")}`;
  }

  function getCanvasWidth(variationCount) {
    return Math.max(minimumCanvasWidth, 260 + variationCount * variationGap);
  }

  return {
    buildSampleTree,
    getCanvasWidth
  };
})();
