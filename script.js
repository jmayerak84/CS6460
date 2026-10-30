const state= {
    problem: null,
    problemIndex: -1;
    equation: "",
    variable: "",
    steps: [],
    results: [],
    solved: false,
    stats: {solved: 0, streak: 0, correct: 0, attempts: 0}
};

let problems = [];

async function loadData(){
    const response = await fetch("one_step_problems.json"); 
    problems = await response.json();
    loadProblem(randomProblemIndex());
}

function randomPromblemIndex(){
    let index;
    do {
        index = Math.floor(Math.random() * problems.length);
    } while(problems.length > 1 && index === state.problemIndex);
    return index;
}

function loadProblem(index){
    const problem = problems[index];
    state.problem = problem;
    state.problemIndex = index;
    state.equation = problem.equation;
    state.variable = problem.variable;
    state.steps = [];
    state.results = [];
    state.solved = false;
    create();
}

function toFunction(expression, variable){
    const text = expression.trim().toLowerCase();

    const allowed = new RegExp(`^[0-9${variable}+\\-*/().\\s]+$`);
    if (!allowed.test(text)) return null;

    let code = text.replace(/(\d|\))\s*(?=[a-z(])/g, "$1*").replace(/([a-z])\s*(?=[(\d])/g, "$1*").replace(/--/g, "+");

    try {
        return new Function(variable, `return (${code});`);
    } catch (error){
        return null;
    }
}

function submitStep(){
    if (state.solved) return;
    const last = state.steps.length - 1;
    if (last >= 0){
        const ok = checkStep(last);
        if(!ok || state.solved){
            create();
            if (!state.solved) focusLastStep();
            return;
        }
    }
    addStep();
}

function addStep(){
    state.steps.push("");
    create();
    focusLastStep();
}

function focusLastStep(){
    const inputs = document.querySelectorAll(".stepInput");
    if (inputs.length) inputs[inputs.length - 1].focus();
}

function newProblem(){
    loadProblem(randomPromblemIndex());
}


function create(){
    document.getElementById("currentEquation").textContent = state.equation;
    document.getElementById("variableValue").textContent = state.variable;
    document.getElementById("emptyEquation").textContent = state.equation;
    document.getElementById("emptySteps").hidden = state.steps.length > 0;

    const {solved, streak, correct, attempts} = state.stats;
    document.getElementById("statSolved").textContent = solved;
    document.getElementById("statStreak").textContent = streak;
    document.getElementById("statAccuracy").textContent = attempts === 0 ? "100%" : Math.round(correct / attempts * 100) + "%";
    
    const list = document.getElementById("stepsList");
    list.innerHTML = "";
    state.steps.forEach((text, i) => {

        const result = state.results[i];

        const row = document.createElement("div");
        row.className = "stepRow";

        const number = document.createElement("span");
        number.className = "stepNumber";
        number.textContent = i + 1;

        const input = document.createElement("input");
        input.type = "text";
        input.className = "stepInput" + (result ? " " + result.status : "");
        input.value = text;
        input.placeholder = `Step ${i + 1}: type your next equation and press Enter`;
        input.disabled = state.solved;

        input.addEventListener("input", () => {
            state.steps[i] = input.value;
            state.results[i] = null;
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") submitStep();
        });

        row.append(number, input);
        list.append(row);

        if(result){
            const feedback = document.createElement("p");
            feedback.className = "stepFeedback " + result.status;
            feedback.textContent = result.message;
            list.append(feedback);
        }
    });

    document.getElementById("nextStep").disabled = state.solved;
}



document.getElementById("firstStep").addEventListener("click", addStep);
document.getElementById("nextStep").addEventListener("click", addStep);
document.getElementById("newProblem").addEventListener("click", newProblem0);

loadData();