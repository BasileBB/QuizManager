from flask import Flask, render_template, request, session, redirect, url_for, send_from_directory
from flask_socketio import join_room, leave_room, send, SocketIO
import os
from glob import glob
from random import choice, shuffle
from string import ascii_uppercase
from datetime import datetime

app = Flask(__name__)
app.config["SECRET_KEY"] = "123456789"
socketio = SocketIO(app)

teams = {}
questionType = 0
questionCount = 0
imagename = ""
buzzCount = 0
teamCount = 0

@app.route('/', methods=['POST', 'GET'])
def home():
    if request.method == 'POST':
        name = request.form.get("name")
        join = request.form.get("join", False)

        global teamCount

        if not name:
            return render_template("home.html", error="Entrez un nom d'équipe")
        
        if name == "gamemaster":
            return render_template("home.html", error="Entrez un autre nom d'équipe")

        if name in teams and teams[name]["connected"]:
            return render_template("home.html", error="Nom d'équipe déjà prit")

        session["room"] = "teams"
        session["name"] = name

        if name not in teams:
            teams[name] = {
                "score" : 0,
                "idx": teamCount,
                "connected": True,
                "answer": "",
                "sample": distribute_sample(remaining_sample_list),
                "history": []}
            
            teamCount += 1

        return redirect(url_for("play"))
    else:
        name = session.get("name","")
        return render_template("home.html", name=name)

@app.route('/reset')
def reset():
    session.clear()
    return redirect(url_for("home"))


@app.route('/play')
def play():
    name = session.get("name")
    if name not in teams:
        return redirect(url_for("home"))
    else:
        print(questionType)
        return render_template("play.html", name=name, data=teams[name], questionType=questionType, imageURL=imagename)

@app.route('/gamemaster', methods=['POST', 'GET'])
def admin():
    name = session.get("name")
    if not name or name != "gamemaster":
        print(f"{name} is now gamemaster")
        session["name"] = "gamemaster"

    return render_template("gamemaster/gamemaster.html", teams=teams)


#######################
# Connecte/disconnect #
#######################
@socketio.on('connect')
def connect():
    name = session.get("name")
    if not name:
        return
    if name == "gamemaster":
        join_room("gamemaster")
        print(f"{name} joined quiz")
    if name not in teams:
        return

    join_room("teams")
    join_room(name)
    teams[name]["connected"]=True
    
    content = {
        "name": name,
        "data": teams[name],
        "action": "connect"
    }
    send(content, to="gamemaster")
    print(f"{name} joined teams")

@socketio.on('disconnect')
def disconnect():
    name = session.get("name")
    if name not in teams:
        print(f"{name} left")
        return
    
    leave_room("teams")
    join_room(name)
    teams[name]["connected"]=False

    print(f"{name} left teams")
    send({"name": name, "data": teams[name], "action": "disconnect"}, to="gamemaster")


##################
# Players socket #
##################
@socketio.on("answer")
def answer(data):
    name = session.get("name")
    if name not in teams:
        return
    
    teams[name]["answer"] = data["data"]
    
    content = {
        "name": name,
        "data": data["data"],
        "action": "answer"
    }
    send(content, to="gamemaster")
    print(f"{name} said: {data['data']}")

@socketio.on('buzz')
def buzz():
    name = session.get('name')
    if name not in teams:
        return

    global buzzCount
    buzzCount += 1

    teams[name]["answer"] = buzzCount

    content = {
        "name": name,
        "data": buzzCount,
        "action": "buzz"
    }

    send(content, to="gamemaster")
    print(f"{name} buzz in {buzzCount}")


######################
# Game master socket #
######################
@socketio.on("updateScore")
def updateScore(data):
    name = data['name']
    if not name:
        return
    if name not in teams:
        return
    teams[name]["score"] += data["update"]
    content = {
        "action": "updateScore",
        "score": teams[name]["score"]
    }
    send(content, to=name)
    print(f"{data['name']} get {data['update']} to score")

@socketio.on("upOrder")
def upOrder(data):
    name = data['name']
    if name not in teams:
        return
    if teams[name]['idx'] == 0:
        return
    
    old_idx = teams[name]['idx']
    new_idx = -1
    inverted_team = ""

    for n, team in teams.items():
        if team['idx'] < old_idx and team['idx'] > new_idx:
            new_idx = team['idx']
            inverted_team = n
    
    if inverted_team=="":
        return

    teams[inverted_team]['idx'] = old_idx
    teams[name]['idx'] = new_idx

    content = {
        "action": "updateOrder",
        "teams": [name, inverted_team],
        "order": [new_idx, old_idx]
    }

    send(content, to="gamemaster")


@socketio.on("downOrder")
def downOrder(data):
    name = data['name']
    if name not in teams:
        return

    old_idx = teams[name]['idx']
    new_idx = 1000
    inverted_team = ""

    for n, team in teams.items():
        if team['idx'] > old_idx and team['idx'] < new_idx:
            new_idx = team['idx']
            inverted_team = n
    
    if inverted_team=="":
        return

    teams[inverted_team]['idx'] = old_idx
    teams[name]['idx'] = new_idx

    content = {
        "action": "updateOrder",
        "teams": [name, inverted_team],
        "order": [new_idx, old_idx]
    }

    send(content, to="gamemaster")

@socketio.on("kick")
def kick(data):
    name = data['name']
    if not name or name not in teams:
        return
    del teams[name]
    send({"action": "kick"}, to=name)
    print(f"{name} has been removed from quiz")

@socketio.on("question")
def sendQuestion(data):
    global questionType
    questionType = data['type']
    print(f"new {questionType} send")
    for name, team in teams.items():
        team["history"].append(team.get("answer", ""))
        team["answer"] = ""
    
    content = {
        "action": "question",
        "type": questionType
    }
    
    if questionType == "3":
        global buzzCount
        buzzCount = 0
    if questionType == "2":
        if not os.path.exists("static/image"):
            os.mkdir("static/image")
        name = datetime.now().strftime('%d%m%y%H%M%S')
        f = open("static/image/tempfile" + name, "wb")
        f.write(data['image'])
        content["image"] = url_for("static", filename="/image/tempfile"+name)
        global imagename
        imagename = f.name
    
    send(content, to="teams")

@socketio.on("history")
def getHistory():
    send()

##################
# Other function #
##################

def distribute_sample(p_remaining_sample):
    if not sample_list:
        return ""
    else:
        if not p_remaining_sample:
            p_remaining_sample = sample_list.copy()
            shuffle(p_remaining_sample)

        return p_remaining_sample.pop()

if __name__ == "__main__":
    # socketio.run(app, debug=True)
    sample_list = glob("*.mp3", root_dir="static/sample")
    remaining_sample_list = sample_list.copy()
    shuffle(remaining_sample_list)
    socketio.run(app, host="0.0.0.0", port=3000)