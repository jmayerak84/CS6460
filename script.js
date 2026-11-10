









const state= {
    problem: null,
    problemIndex: -1,
    equation: "",
    variable: "",
    steps: [],
    results: [],
    solved: false,
    lesson: "one-step",
    hadError: false,
    history: [],
    mastered: false,
    completionCode: "",
    mode: "guided",
    hintsUsed: 0,
    guidedStreak: 0,
    missStreak: 0,
    modeNotice: "",
    stats: {solved: 0, streak: 0, correct: 0, attempts: 0}
};

let problems = [];


const LESSON_FILES = {
    "one-step": "one_step_problems.json",
    "two-step": "two_step_problems.json",
    "multi-step-1": "multi_step_1_problems.json",
    "multi-step-2": "multi_step_2_problems.json"
};

let lessonCodes = {};

const MASTERY_WINDOW = 5;
const MASTERY_NEEDED = 4;

let hints = {};
const GUIDED_TO_MASTERY = 2;
const MASTERY_TO_GUIDED = 2;





async function loadData(){
    const lesson = new URLSearchParams(window.location.search).get("lesson") || "one-step";
    state.lesson = LESSON_FILES[lesson] ? lesson : "one-step";
    const [problemRes, codeRes, hintRes] = await Promise.all([
        fetch(LESSON_FILES[state.lesson]),
        fetch("completion_codes.json"),
        fetch("hints.json")
    ]);
    problems = await problemRes.json();
    lessonCodes = await codeRes.json();
    hints = await hintRes.json();
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
    state.hadError = false;
    state.hintsUsed = 0;
    create();
}







function toFunction(expression, variable){
    const text = expression.trim().toLowerCase();

    
    const allowed = new RegExp(`^[0-9${variable}+\\-*/().\\s]+$`);
    if (!allowed.test(text)) return null;

    
    
    let code = text
        .replace(/(\d|\))\s*(?=[a-z(])/g, "$1*")
        .replace(/([a-z])\s*(?=[(\d])/g, "$1*")
        .replace(/--/g, "+");

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
    return sides.length === 2 && 
        (sides[0] === variable || sides[1] ===variable) && 
        !(sides[0].includes(variable) && sides[1].includes(variable));
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
        if(isSolvedLine(text, state.variable)){
            state.solved = true;
            state.stats.solved++;
            state.stats.streak++;
            finishProblem(!state.hadError && state.hintsUsed === 0);
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
        state.hadError = true;
    }
    return state.results[i].status === "correct";
}






function submitStep(){
    if (state.solved) return;


    if(state.mode === "mastery"){
        const last = state.steps.length - 1;
        if (last >= 0 && state.steps[last].trim() === "") { focusLastStep(); return;}
        addStep();
        return;
    }

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


function recordResults(correct){
    state.history.push(correct);
    if(state.history.length > MASTERY_WINDOW) state.history.shift();
    const correctCount = state.history.filter(r => r).length;
    if(correctCount >= MASTERY_NEEDED && !state.mastered){
        state.mastered = true;
        const codes = lessonCodes[state.lesson];
        state.completionCode = codes[Math.floor(Math.random() * codes.length)];
    }
}



const MIN_LINES = {"one-step": 1};

function submitSolution(){
    if(state.mode !== "mastery" || state.solved) return;


    state.steps = state.steps.filter(s => s.trim() !== "");
    state.results = [];
    if (state.steps.length === 0) { create(); return;}

    const answer = toNumber(state.problem.solution);
    const last = state.steps.length - 1;

    for(let i = 0; i <= last; i++){
        const value = solveLine(state.steps[i].trim(), state.variable);

        if(value === null){
            
            state.results[i] = {status: "invalid", message: `I can't read this line. Write one equation with a single = sign using ${state.variable}.`};
            create();
            return;
        }
        if(!sameValue(value, answer)){

            state.results[i] = {status: "wrong", message: "This is the first line that isn't equivalent to the original equation. Check the step that led to it."};
            state.stats.attempts++;
            state.stats.streak = 0;
            state.hadError = true;
            create();
            return;
        }
        state.results[i] = {status: "correct", message: ""};
    }


    if(!isSolvedLine(state.steps[last], state.variable)){
        state.results[last] = {status: "invalid", message: `Everything checks out so far, but you haven't finished. Keep going until ${state.variable} is alone.`};
        create();
        return;
    }
    const needed = MIN_LINES[state.lesson] || 2;
    if(state.steps.length < needed){
        state.results[last] = {status: "invalid", message: "Show at least one step of your work before your final answer."}
        create();
        return;
    }


    state.stats.attempts++;
    state.stats.correct++;
    state.solved = true;
    state.stats.solved++;
    state.stats.streak++;
    state.results[last] = {status: "correct", message: `Solved! ${state.variable} = ${state.problem.solution}. Click "New Problem" to keep practicing.`};
    finishProblem(!state.hadError);
    create();
}



function finishProblem(clean){
    state.modeNotice = "";
    if(state.mode === "mastery"){
        recordResults(clean);
        state.missStreak = clean ? 0 : state.missStreak + 1;
        if(state.missStreak >= MASTERY_TO_GUIDED && !state.mastered){
            state.mode = "guided";
            state.missStreak = 0;
            state.modeNotice = "Let's practice with hints for a bit. You're back in Guided mode.";
        }
    } else{
        state.guidedStreak = clean ? state.guidedStreak + 1 : 0;
        if(state.guidedStreak >= GUIDED_TO_MASTERY){
            state.mode = "mastery";
            state.guidedStreak = 0;
            state.modeNotice = "Nice work! You've moved up to Mastery mode: no hints, and these problems count toward your code.";
        }
    }
}


function showHint(){
    if(state.mode !== "guided" || state.solved) return;
    const list = hints[state.problem.form] || hints["default"];
    if(state.hintsUsed < list.length) state.hintsUsed++;
    create();
}



function newProblem(){
    if (!state.solved) state.stats.streak = 0;
    if(!state.solved && state.steps.some(s => s.trim() !== "")){
        finishProblem(false);
    }
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
    document.getElementById("statAccuracy").textContent = 
        attempts === 0 ? "100%" : Math.round(correct / attempts * 100) + "%";

    
    drawMastery();


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
        input.placeholder = state.mode === "mastery"
            ? `Line ${i + 1}: type your work (Enter adds a new line)`
            : `Step ${i + 1}: type your next equation and press Enter`;
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

        
        if(result && result.message){
            const feedback = document.createElement("p");
            feedback.className = "stepFeedback " + result.status;
            feedback.textContent = result.message;
            list.append(feedback);
        }
    });

    document.getElementById("nextStep").disabled = state.solved;
}



function drawMastery(){
    const box = document.getElementById("mastery");
    box.innerHTML = "";

    if(state.mastered){
        box.className = "mastery done";
        box.innerHTML = `Mastery Reached! Your completion code is <strong>${state.completionCode}</strong>. ` + 
            `Enter it in the Mastery Check quiz in Canvas. You can keep practicing here.`;
    } else if(state.mode === "guided"){

        box.className = "mastery";
        box.innerHTML = `<span class="modeBadge guided">Guided</span>` + 
            `<span>Solve ${GUIDED_TO_MASTERY} problems in a row with no mistakes and no hints to move to Mastery ` + 
            `(${state.guidedStreak}/${GUIDED_TO_MASTERY}).</span>`;
    } else{

        box.className = "mastery";
        box.innerHTML = `<span class="modeBadge">Mastery</span>`;
        const label = document.createElement("span");
        label.textContent = `Write your full solution, then click Submit. Solve ${MASTERY_NEEDED} of your last ${MASTERY_WINDOW} with no mistakes:`;
        box.append(label);
        for(let i = 0; i < MASTERY_WINDOW; i++){
            const dot = document.createElement("span");
            const result = state.history[i];
            dot.className = "dot" + (result === true ? " hit" : result === false ? " miss" : "");
            box.append(dot);
        }
    }


    const notice = document.getElementById("modeNotice");
    notice.textContent = state.modeNotice;
    notice.hidden = !state.modeNotice;


    const hintBox = document.getElementById("hintBox");
    const list = hints[state.problem.form] || hints["default"] || [];
    hintBox.innerHTML = "";
    list.slice(0, state.hintsUsed).forEach((text, i) => {
        const p = document.createElement("p");
        p.textContent = `Hint ${i + 1}: ` + text.replaceAll("{variable}", state.variable);
        hintBox.append(p);
    });
    hintBox.hidden = state.hintsUsed === 0;

    
    const submitBtn = document.getElementById("submitSolution");
    submitBtn.hidden = state.mode !== "mastery";
    submitBtn.disabled = state.solved || state.steps.length === 0;

    const hintBtn = document.getElementById("hintBtn");
    hintBtn.hidden = state.mode !== "guided";
    hintBtn.disabled = state.solved || state.hintsUsed >= list.length;
}




document.getElementById("firstStep").addEventListener("click", addStep);
document.getElementById("nextStep").addEventListener("click", submitStep);
document.getElementById("newProblem").addEventListener("click", newProblem);
document.getElementById("hintBtn").addEventListener("click", showHint);
document.getElementById("submitSolution").addEventListener("click", submitSolution);

loadData();