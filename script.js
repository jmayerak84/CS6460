const state= {
    problem: null,
    problemIndex: -1,
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

function randomProblemIndex(){
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

function solveLine(line, variable){
    const sides = line.split("=");
    if(sides.length !== 2 || !sides[0].trim() || !sides[1].trim()) return null;

    const left = toFunction(sides[0], variable);
    const right = toFunction(sides[1], variable);
    if(!left || !right) return null;

    try{
        const f = v => left(v) - right(v);
        const f0 = f(0), f1 = f(1), f2 = f(2);
        const slope = f1 - f0;
        if(!Number.isFinite(f0) || Math.abs(slope) < 1e-9) return null;
        if(Math.abs((f2 - f1) - slope) > 1e-9) return null;
        return -f0 / slope;
    } catch(error){
        return null;
    }
}

function sameValue(a, b){
    return Math.abs(a-b) < 1e-9;
}

function toNumber(text){
    const f = toFunction(text, "x");
    return f ? f(0) : NaN;
}

function isSolvedLine(line, variable){
    const sides = line.split("=").map(s => s.trim().toLowerCase());
    return sides.length === 2 && (sides[0] === variable || sides[1] ===variable) && !(sides[0].includes(variable) && sides[1].includes(variable));
}

function checkStep(i){
    const text = state.steps[i].trim();
    if(!text) return false;

    const value = solveLine(text, state.variable);
    const answer = toNumber(state.problem.solution);

    if(value === null){
        state.results[i] = {
            status: "invalid",
            message: `I can't read this line. Write one equation with a single = sign using ${state.variable}.`
        };
        return false;
    }

    state.stats.attempts++;
    if(sameValue(value, answer)){
        state.stats.correct++;
        state.stats.streak++;
        if(isSolvedLine(text, state.variable)){
            state.solved = true;
            state.stats.solved++;
            state.results[i] = {status: "correct", message: `Solved! ${state.variable} = ${state.problem.solution}. Click "New Problem" to keep practicing.`};
        } else{
            state.results[i] = {status: "correct", message: "Valid step. Keep Going."};
        }
    } else {
        state.results[i] = {
            status: "wrong",
            message: "This line isn't equivalent to the original equation. Check that you used the inverse operation on both sides."
        };
        state.stats.streak = 0;
    }
    return state.results[i].status === "correct";
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
    loadProblem(randomProblemIndex());
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
document.getElementById("nextStep").addEventListener("click", submitStep);
document.getElementById("newProblem").addEventListener("click", newProblem);

loadData();