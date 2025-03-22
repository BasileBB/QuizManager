var socketio = io();

const simple_question = `
<h2>Votre réponse</h2>
<textarea class="player-answer" rows="10" placeholder="Votre réponse" id="answer"></textarea>
<button type="button" class="send-btn" name="send" id="send-btn" onclick="clickValidate()">Valider</button>
`
const buzz_question = `
<button type="button" class="buzz" id="buzz" onclick="clickBuzz()">BUZZ</button>
`

const image_question = `
<img class="question-image" id="question-image">
<textarea class="player-answer" rows="2" placeholder="Votre réponse" id="answer"></textarea>
<button type="button" class="send-btn" name="send" id="send-btn" onclick="clickValidate()">Valider</button>
`

const clickValidate = () => {
    const answer = document.getElementById("answer");
    if (answer.disabled){
        answer.disabled=false;
        document.getElementById('send-btn').innerHTML = "Valider"
    }else{
        if(answer.value == "") {
            return;
        }else{
            sendAnswer();
            answer.disabled=true;
            document.getElementById('send-btn').innerHTML = "Modifier";
        }
    }
};

const clickBuzz = () => {
    const buzz = document.getElementById("buzz");
    buzz.disabled = true;
    socketio.emit("buzz");
    document.getElementById("buzzSound").play()

}

const sendAnswer = () => {
    const answer = document.getElementById("answer")
    socketio.emit("answer", {data: answer.value});
};

const lockAnswer = () => {
    sendAnswer();
    answer.disabled=true;
    document.getElementById('send-btn').remove();
};

socketio.on("message", (data) => {
    console.log(data);
    switch(data.action){
        case "updateScore":
            document.getElementById('score').innerHTML = data.score;
            break;
        case "question":
            console.log("new question")
            const question = document.getElementById("question")
            switch(data.type){
                case "1":
                    question.innerHTML = simple_question;
                    break;
                
                case "2":
                    question.innerHTML = image_question;
                    const img = document.getElementById("question-image");
                    img.src = data.image;
                    break;
                
                case "3":
                    question.innerHTML = buzz_question;
                    break;
                default:

            }
            break;
        case "lock":
            if (data.state){
                lockAnswer()
            }
            break;
        case "kick":
            console.log("I'm kicked")
            window.location.replace("/")
            break;
        default:
            console.log("Unexpected action");
    }
})