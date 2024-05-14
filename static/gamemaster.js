
var socketio = io();


const addTeam = (name, score, order) => {
    const teams = document.getElementById("teams-list")
    console.log(name + " joined quiz");
    if (document.getElementById(name) == null){
        const content = `
            <div class="team" id="${ name }" style="order: ${ order }">
                <header class="banner">
                    <div>
                        <h4>
                            ${ name }
                        </h4>
                    </div>
                    <div class="score">
                        <input type="button" value="-" onclick="subPoint(\`${ name }\`)">
                        <span id="score-${ name }">
                            0
                        </span>
                        <input type="button" value="+" onclick="addPoint(\`${ name }\`)">
                    </div>
                    <div class="team-controller">
                        <input type="button" value="↑" onclick="upOrder(\`${ name }\`)">
                        <input type="button" value="↓" onclick="downOrder(\`${ name }\`)">
                        <input type="button" value="Kick" onclick="kick(\`${ name }\`)">
                    </div>
                </header>
                <div class="answer">
                    <pre id="${ name }-answer"></pre>
                </div>
            </div>
        `;
        teams.innerHTML += content;
    }else{
        document.getElementById(name).style.filter = "";
        document.getElementById(name).style.order = order
    }
};

const addAnswer = (name, new_answer) => {
    const answer = document.getElementById(name + "-answer");
    answer.innerHTML = new_answer;
}

const disconnectTeam = (name) => {
    const team = document.getElementById(name);

    team.style.filter = "grayscale(1)";
    team.style.order = "10000"

    // team.remove();
}

const addPoint = (name) => {
    const score = document.getElementById("score-" + name)
    socketio.emit("updateScore", {"name": name, "update": 1});
    score.innerHTML = parseInt(score.innerHTML) + 1
}

const subPoint = (name) => {
    const score = document.getElementById("score-" + name)
    socketio.emit("updateScore", {"name": name, "update": -1});
    score.innerHTML = parseInt(score.innerHTML) - 1
}

const upOrder = (name) => {
    //document.getElementById(name).style.order -= 1;
    socketio.emit("upOrder", {"name": name});
}

const downOrder = (name) => {
    // document.getElementById(name).style.order -= -1;
    socketio.emit("downOrder", {"name": name});
}

const updateOrder = (teams, order) => {
    for (let i = 0; i < teams.length; i++) {
        document.getElementById(teams[i]).style.order = order[i]
    }
}

const kick = (name) => {
    socketio.emit("kick", {"name": name});
    document.getElementById(name).remove();
}

const sendNewQuestion = () => {
    const selected = document.querySelector('input[name="question"]:checked');
    socketio.emit("question", {"type": selected.value});
    
    const answers = document.querySelectorAll('.answer *');
    for (let i = 0 ; i < answers.length; i++){
        answers[i].innerHTML = ""
    }
}

socketio.on("message", (data) => {
    // console.log(data.name + " joined quiz");
    // addTeam(data.name, data.data.score)
    console.log(data);
    switch(data.action){
        case "connect":
            addTeam(data.name, data.data.score, data.data.idx);
            break;
        case "disconnect":
            disconnectTeam(data.name);
            break;
        case "answer":
            addAnswer(data.name, data.data);
            break;
        case "buzz":
            addAnswer(data.name, data.data);
            break;
        case "updateOrder":
            updateOrder(data.teams, data.order)
            break;
        default:
            console.log("Unexpected action");
    }
})