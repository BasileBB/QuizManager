
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
                    <div>
                        <button type="button" onclick="subPoint(\`${ name }\`)">-</button>
                        <div class="score">
                            <span id="score-${ name }">0</span>
                            <span class="scoring" id="scoring-${ name }"></span>
                        </div>
                        <button type="button" onclick="addPoint(\`${ name }\`)">+</button>
                    </div>
                    <div class="team-controller">
                        <button type="button" onclick="upOrder(\`${ name }\`)">↑</button>
                        <button type="button" onclick="downOrder(\`${ name }\`)">↓</button>
                        <button type="button" onclick="kick(\`${ name }\`)">Kick</button>
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

}

const addPoint = (name) => {
    updateScoring(document.getElementById("scoring-" + name), 1);
}

const subPoint = (name) => {
    updateScoring(document.getElementById("scoring-" + name), -1);
}

const updateScoring = (scoring, point) => {
    var score = parseInt(scoring.innerHTML);
    if(isNaN(score)){
        score = 0
    }
    var new_scoring = score + point;
    if(new_scoring == 0){   
        scoring.innerHTML = new_scoring;
        // scoring.style.background = "grey";
        scoring.style.color = "grey"
        scoring.style.borderColor = "grey"
    }else if(new_scoring > 0){
        scoring.innerHTML = "+" + new_scoring
        // scoring.style.background = "forestgreen";
        scoring.style.color = "lawngreen"
        scoring.style.borderColor = "lawngreen"
    }else{
        scoring.innerHTML = new_scoring
        // scoring.style.background = "red";
        scoring.style.color = "firebrick";
        scoring.style.borderColor = "firebrick";
    }
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
    const question_type = document.querySelector('input[name="question"]:checked').value;

    if (question_type=="2") {
        const questionImage = document.getElementById("question-image").files[0]
        console.log("send 2")
        socketio.emit("question", {"type": question_type, "image": questionImage})
    }else{
        socketio.emit("question", {"type": question_type});
    }

    
    const teams = document.querySelectorAll('.team');
    for (let i = 0 ; i < teams.length; i++){
        teams[i].querySelector('.answer *').innerHTML = "";
        const scoring = parseInt(teams[i].querySelector('.scoring').innerHTML);
        if(!isNaN(scoring)){
            socketio.emit("updateScore", {"name": teams[i].getAttribute("id"), "update": scoring});
            teams[i].querySelector('.scoring').innerHTML = "";
            teams[i].querySelector('.score *').innerHTML = parseInt(teams[i].querySelector('.score *').innerHTML) + scoring;
        }
    }
}

function loadQuestionOption(value) {
    const options = document.getElementById("question-option");
    switch (value) {
        case "2":
            options.innerHTML = `<input type="file" id="question-image" accept="image/png, image/jpeg" oninput="displayImage(this)">`;
            options.style.display = "inline-flex"
            break;
    
        default:
            options.innerHTML = "";
            options.style.display = "none"
            break;
    }    
}

function displayImage(file_input){
    console.log(this.files);
    const new_image = file_input.files[0];
    let img = document.getElementById("loaded-image");
    
    if (img==null){
        img = document.createElement("img");
        img.classList.add("loaded-image");
        img.id = "loaded-image";
    }

    img.src = window.URL.createObjectURL(new_image);
    document.getElementById("question-option").appendChild(img);

}

socketio.on("message", (data) => {
    // console.log(data.name + " joined quiz");
    
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