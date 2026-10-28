const state= {
    equation: "2x + 5 = 15",
    variable: "x",
    steps: [],
    stats: {solved: 0, streak: 0, correct: 0, attempts: 0}
};

function create(){
    document.getElementById("currentEquation").textContent = state.equation;
    document.getElementById("variableValue").textContent = state.variable;
    document.getElementById("emptyEquation").textContent = state.equation;
    document.getElementById("emptySteps").hidden = state.steps.length > 0;
}

document.getElementById("firstStep").addEventListener("click", () => {
    console.log("TODO: add first step input");
});

document.getElementById("nextStep").addEventListener("click", () => {
    console.log("TODO: add enxt step input");
});

create();