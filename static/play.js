var socketio = io();

const simple_question = `
<h2>Votre réponse</h2>
<textarea class="player-answer" rows="10" placeholder="Votre réponse" id="answer"></textarea>
<button type="button" class="send-btn" name="send" id="send-btn" onclick="clickValidate()">Valider</button>
`
const buzz_question = `
<button type="button" class="buzz" id="buzz" onclick="clickBuzz()">BUZZ</button>
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

}

const sendAnswer = () => {
    const answer = document.getElementById("answer")
    socketio.emit("answer", {data: answer.value});
};

socketio.on("message", (data) => {
    console.log(data);
    switch(data.action){
        case "updateScore":
            document.getElementById('score').innerHTML = data.score;
            break;
        case "question":
            switch(data.type){
                case "1":
                    document.getElementById("question").innerHTML = simple_question;
                    break;
                case "3":
                    document.getElementById("question").innerHTML = buzz_question;
                    break;
                default:

            }
            break;
        case "kick":
            console.log("I'm kicked")
            window.location.replace("/")
        default:
            console.log("Unexpected action");
    }
})