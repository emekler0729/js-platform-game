/**
 * Created by Eduard on 3/5/2017.
 */

var simpleLevelPlan = [
    "                      ",
    "                      ",
    "  x              = x  ",
    "  x         o o    x  ",
    "  x @      xxxxx   x  ",
    "  xxxxx            x  ",
    "      x!!!!!!!!!!!!x  ",
    "      xxxxxxxxxxxxxx  ",
    "                      "
];

/**
 * Assumes proper level plan with player start and other essentials.
 * @param plan
 * @constructor
 */
function Level(plan) {
    this.width = plan[0].length;
    this.height = plan.length;
    this.grid = [];
    this.actors = [];

    for(var y = 0; y < this.height; y++) {
        var line = plan[y], gridLine = [];
        for(var x = 0; x < this.width; x++) {
            var ch = line[x], fieldType = null;
            var Actor = actorChars[ch];
            if(Actor) {
                this.actors.push(new Actor(new Vector(x, y), ch));
            } else if (ch == "x") {
                fieldType = "wall";
            } else if (ch == "!") {
                fieldType = "lava";
            }

            gridLine.push(fieldType);
        }

        this.grid.push(gridLine);
    }

    this.player = this.actors.filter(function(actor) {
        return actor.type == "player";
    })[0];

    this.status = this.finishDelay = null;
}

Level.prototype.isFinished = function() {
    return this.status != null && this.finishDelay < 0;
};

function Vector(x, y) {
    this.x = x;
    this.y = y;
}

Vector.prototype.plus = function(other) {
    return new Vector(this.x + other.x, this.y + other.y);
};

Vector.prototype.times = function(factor) {
    return new Vector(this.x * factor, this.y * factor);
};

var actorChars = {
    "@": Player,
    "o": Coin,
    "=": Lava,
    "|": Lava,
    "v": Lava
};

function Player(pos) {
    this.pos = pos.plus(new Vector(0, -0.5));
    this.size = new Vector(0.8, 1.5);
    this.speed = new Vector(0, 0);
}

Player.prototype.type = "player";

function Lava(pos, ch) {
    this.pos = pos;
    this.size = new Vector(1, 1);

    if(ch == "=") {
        this.speed = new Vector(2, 0);
    } else if(ch == "|") {
        this.speed = new Vector(0, 2);
    } else if(ch == "v") {
        this.speed = new Vector(0, 3);
        this.repeatPos = pos;
    }
}

Lava.prototype.type = "lava";

function Coin(pos) {
    this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
    this.size = new Vector(0.6, 0.6);
    this.wobble = Math.random() * Math.PI * 2;
}

Coin.prototype.type = "coin";

function newElement(name, className) {
    var elt = document.createElement(name);
    if(className) {
        elt.className = className;
    }
    return elt;
}

function DOMDisplay(parent, level) {
    this.wrap = parent.appendChild(newElement("div", "game"));
    this.level = level;

    this.wrap.appendChild(this.drawBackground());
    this.wrap.appendChild(this.drawStatus());
    this.actorLayer = null;
    this.drawFrame();
}

var scale = 20;

DOMDisplay.prototype.drawBackground = function() {
    var table = newElement("table", "background");
    table.style.width = this.level.width * scale + "px";

    this.level.grid.forEach(function(row) {
        var rowElt = table.appendChild(newElement("tr"));
        rowElt.style.height = scale + "px";
        row.forEach(function(type) {
            rowElt.appendChild(newElement("td", type));
        });
    });

    return table;
};

DOMDisplay.prototype.drawActors = function() {
    var wrap = newElement("div");

    this.level.actors.forEach(function(actor) {
        var rect = wrap.appendChild(newElement("div", "actor " + actor.type));
        rect.style.width = actor.size.x * scale + "px";
        rect.style.height = actor.size.y * scale + "px";
        rect.style.left = actor.pos.x * scale + "px";
        rect.style.top = actor.pos.y * scale + "px";
    });

    return wrap;
};

DOMDisplay.prototype.drawStatus = function() {
    var wrap = newElement("div");

    var status = wrap.appendChild(newElement("div", "status"));
    status.textContent = "Lives: " + lives;
    status.style.left = 2 * scale + "px";
    status.style.top = 1.5 * scale + "px";

    return wrap;
};

DOMDisplay.prototype.drawFrame = function() {
    if(this.actorLayer) {
        this.wrap.removeChild(this.actorLayer);
    }

    if(this.statusLayer) {
        this.wrap.removeChild(this.statusLayer);
    }

    this.actorLayer = this.wrap.appendChild(this.drawActors());
    this.wrap.className = "game " + (this.level.status || "");
    this.scrollPlayerIntoView();
};

DOMDisplay.prototype.scrollPlayerIntoView = function() {
    var width = this.wrap.clientWidth;
    var height = this.wrap.clientHeight;
    var margin = width / 3;

    // The viewport
    var left = this.wrap.scrollLeft, right = left + width;
    var top = this.wrap.scrollTop, bottom = top + height;

    var player = this.level.player;
    var center = player.pos.plus(player.size.times(0.5)).times(scale);

    if(center.x < left + margin) {
        this.wrap.scrollLeft = center.x - margin;
    } else if(center.x > right - margin) {
        this.wrap.scrollLeft = center.x + margin - width;
    }

    if(center.y < top + margin) {
        this.wrap.scrollTop = center.y - margin;
    } else if(center.y > bottom - margin) {
        this.wrap.scrollTop = center.y + margin - height;
    }
};

DOMDisplay.prototype.createOverlay = function() {
    var self = this;
    var wrap;

    return {
        draw: function(string) {
            wrap = self.wrap.appendChild(newElement("div", "menu"));
            var box = self.wrap.getBoundingClientRect();

            wrap.style.height = self.wrap.clientHeight + "px";
            wrap.style.width = self.wrap.clientWidth + "px";
            wrap.style.top = box.top + "px";
            wrap.style.left = box.left + "px";

            var text = wrap.appendChild(newElement("div", "menutext"));
            text.textContent = string;
        },

        remove: function() {
            self.wrap.removeChild(wrap);
        }
    };
};

DOMDisplay.prototype.clear = function() {
    this.wrap.parentNode.removeChild(this.wrap);
};

Level.prototype.obstacleAt = function(pos, size) {
    var xStart = Math.floor(pos.x);
    var xEnd = Math.ceil(pos.x + size.x);
    var yStart = Math.floor(pos.y);
    var yEnd = Math.ceil(pos.y + size.y);

    if(xStart < 0 || xEnd > this.width || yStart < 0) {
        return "wall";
    }

    if(yEnd > this.height) {
        return "lava";
    }

    for(var y = yStart; y < yEnd; y++) {
        for(var x = xStart; x < xEnd; x++) {
            var fieldType = this.grid[y][x];
            if(fieldType) return fieldType;
        }
    }
};

Level.prototype.actorAt = function(actor) {
    for(var i = 0; i < this.actors.length; i++) {
        var other = this.actors[i];
        if(other != actor &&
            actor.pos.x + actor.size.x > other.pos.x &&
            actor.pos.x < other.pos.x + other.size.x &&
            actor.pos.y + actor.size.y > other.pos.y &&
            actor.pos.y < other.pos.y + other.size.y) {

            return other;
        }
    }
};

var maxStep = 0.05;

Level.prototype.animate = function(step, keys) {
    if(this.status != null) {
        this.finishDelay -= step;
    }

    while(step > 0) {
        var thisStep = Math.min(step, maxStep);
        this.actors.forEach(function(actor) {
            actor.act(thisStep, this, keys);
        }, this);

        step -= thisStep;
    }
};

Lava.prototype.act = function(step, level) {
    var newPos = this.pos.plus(this.speed.times(step));

    if(!level.obstacleAt(newPos, this.size)) {
        this.pos = newPos;
    } else if(this.repeatPos) {
        this.pos = this.repeatPos;
    } else {
        this.speed = this.speed.times(-1);
    }
};

var wobbleSpeed = 8, wobbleDist = 0.07;

Coin.prototype.act = function(step) {
    this.wobble += step * wobbleSpeed;
    var wobblePos = Math.sin(this.wobble) * wobbleDist;
    this.pos = this.basePos.plus(new Vector(0, wobblePos));
};

var playerXSpeed = 7;

Player.prototype.moveX = function(step, level, keys) {
    this.speed.x = 0;

    if(keys.left) this.speed.x -= playerXSpeed;
    if(keys.right) this.speed.x += playerXSpeed;

    var motion = new Vector(this.speed.x * step, 0);
    var newPos = this.pos.plus(motion);
    var obstacle = level.obstacleAt(newPos, this.size);
    if(obstacle) {
        level.playerTouched(obstacle);
    } else {
        this.pos = newPos;
    }
};

var gravity = 30;
var jumpSpeed = 17;

Player.prototype.moveY = function(step, level, keys) {
    this.speed.y += step * gravity;

    var motion = new Vector(0, this.speed.y * step);
    var newPos = this.pos.plus(motion);
    var obstacle = level.obstacleAt(newPos, this.size);

    if(obstacle) {
        level.playerTouched(obstacle);
        if(keys.up && this.speed.y > 0) {
            this.speed.y = -jumpSpeed;
        } else {
            this.speed.y = 0;
        }
    } else {
        this.pos = newPos;
    }
};

Player.prototype.act = function(step, level, keys) {
    this.moveX(step, level, keys);
    this.moveY(step, level, keys);

    var otherActor = level.actorAt(this);
    if(otherActor) {
        level.playerTouched(otherActor.type, otherActor);
    }

    if(level.status == "lost") {
        this.pos.y += step;
        this.size.y -= step;
    }
};

Level.prototype.playerTouched = function(type, actor) {
    if(type == "lava" && this.status == null) {
        this.status = "lost";
        this.finishDelay = 1;
    } else if (type == "coin") {
        this.actors = this.actors.filter(function(other) {
            return other != actor;
        });

        if(!this.actors.some(function(actor) {
                return actor.type == "coin";
            })) {
            this.status = "won";
            this.finishDelay = 1;
        }
    }
};

var arrowCodes = {37: "left", 38: "up", 39: "right"};

function trackKeys(codes) {
    var pressed = Object.create(null);

    function handler(event) {
        if(codes.hasOwnProperty(event.keyCode)) {
            var down = event.type == "keydown";
            pressed[codes[event.keyCode]] = down;
            event.preventDefault();
        }
    }

    addEventListener("keydown", handler);
    addEventListener("keyup", handler);

    return pressed;
}

function runAnimation(frameFunc) {
    var lastTime = null;

    function frame(time) {
        var stop = false;

        if(lastTime != null) {
            var timeStep = Math.min(time - lastTime, 100) / 1000;
            stop = frameFunc(timeStep) === false;
        }

        lastTime = time;

        if(!stop) {
            requestAnimationFrame(frame);
        }
    }

    requestAnimationFrame(frame);
}

var arrows = trackKeys(arrowCodes);

function runLevel(level, Display, andThen) {
    var display = new Display(document.body, level);
    var pauseScreen = display.createOverlay();
	var running = "yes";
	
	function pause(event) {
		if(event.keyCode == 27) {
			if(running == "yes") {
				running = "pausing";
				pauseScreen.draw("Paused");
			} else if(running == "pausing") {
				running = "yes";
				pauseScreen.remove();
			} else if(running == "no") {
				running = "yes";
				pauseScreen.remove();
				runAnimation(animate);
			}
		}
	}
	
	addEventListener("keydown", pause);
	
	function animate(step) {
		if(running == "pausing") {
			running = "no";
			return false;
		}
		
		level.animate(step, arrows);
		display.drawFrame(step);
		if(level.isFinished()) {
			removeEventListener("keydown", pause);
			if(andThen) {
				andThen(level.status, display);
			}
			
			return false;
		}
	}
	
    runAnimation(animate);
}

var lives = 3;

function runGame(plans, Display) {
    function startLevel(n) {
        runLevel(new Level(plans[n]), Display, function(status, display) {
            if(status == "lost") {
                lives--;
                if(lives > 0) {
                    display.clear();
                    startLevel(n);
                } else {
                    display.createOverlay().draw("Game Over!");
                }
            } else if(n < plans.length - 1) {
                display.clear();
                startLevel(n + 1);
            } else {
                display.createOverlay().draw("You win!");
            }
        });
    }

    startLevel(0);
}

function CanvasDisplay(parent, level) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = Math.min(680, level.width * scale);
    this.canvas.height = Math.min(480, level.height * scale);
    parent.appendChild(this.canvas);
    this.cx = this.canvas.getContext("2d");

    this.level = level;
    this.animationTime = 0;
    this.flipPlayer = false;

    this.viewport = {
        left: 0,
        top: 0,
        width: this.canvas.width / scale,
        height: this.canvas.height / scale
    };

    this.drawFrame(0);
}

CanvasDisplay.prototype.clear = function() {
    this.canvas.parentNode.removeChild(this.canvas);
};

CanvasDisplay.prototype.drawFrame = function(step) {
    this.animationTime += step;
    this.updateViewport();
    this.clearDisplay();
    this.drawBackground();
    this.drawActors();
};

CanvasDisplay.prototype.updateViewport = function() {
    var view = this.viewport, margin = view.width / 3;
    var player = this.level.player;
    var center = player.pos.plus(player.size.times(0.5));

    if(center.x < view.left + margin) {
        view.left = Math.max(center.x - margin, 0);
    } else if(center.x > view.left + view.width - margin) {
        view.left = Math.min(center.x + margin - view.width, this.level.width - view.width);
    }

    if(center.y < view.top + margin) {
        view.top = Math.max(center.y - margin, 0);
    } else if(center.y > view.top + view.height - margin) {
        view.top = Math.min(center.y + margin - view.height, this.level.height - view.height);
    }
};

CanvasDisplay.prototype.clearDisplay = function() {
    switch(this.level.status) {
        case "won":
            this.cx.fillStyle = "rgb(68, 191, 255)";
            break;
        case "lost":
            this.cx.fillStyle = "rgb(44, 136, 214)";
            break;
        default:
            this.cx.fillStyle = "rgb(52, 166, 251)";
            break;
    }

    this.cx.fillRect(0, 0, this.canvas.width, this.canvas.height);
};

var otherSprites = document.createElement("img");
otherSprites.src = "img/sprites.png";

CanvasDisplay.prototype.drawBackground = function() {
    var view = this.viewport;
    var xStart = Math.floor(view.left);
    var xEnd = Math.ceil(view.left + view.width);
    var yStart = Math.floor(view.top);
    var yEnd = Math.ceil(view.top + view.height);

    for(var y = yStart; y < yEnd; y++) {
        for(var x = xStart; x < xEnd; x++) {
            var tile = this.level.grid[y][x];
            if(tile == null) continue;
            var screenX = (x - view.left) * scale;
            var screenY = (y - view.top) * scale;
            var tileX = tile == "lava" ? scale : 0;
            this.cx.drawImage(otherSprites, tileX, 0, scale, scale, screenX, screenY, scale, scale);
        }
    }
};

var playerSprites = document.createElement("img");
playerSprites.src = "img/player.png";
var playerXOverlap = 4;

CanvasDisplay.prototype.drawPlayer = function(x, y, width, height) {
    var sprite = 8, player = this.level.player;
    width += playerXOverlap * 2;
    x -= playerXOverlap;
    if(player.speed.x != 0) {
        this.flipPlayer = player.speed.x < 0;
    }

    if(player.speed.y != 0) {
        sprite = 9;
    } else if (player.speed.x != 0) {
        sprite = Math.floor(this.animationTime * 12) % 8;
    }

    this.cx.save();
    if(this.flipPlayer) {
        flipHorizontally(this.cx, x + width / 2);
    }

    this.cx.drawImage(playerSprites, sprite * width, 0, width, height, x, y, width, height);
    this.cx.restore();
};

CanvasDisplay.prototype.drawActors = function() {
    this.level.actors.forEach(function(actor) {
        var width = actor.size.x * scale;
        var height = actor.size.y * scale;
        var x = (actor.pos.x - this.viewport.left) * scale;
        var y = (actor.pos.y - this.viewport.top) * scale;
        if(actor.type == "player") {
            this.drawPlayer(x, y, width, height);
        } else {
            var tileX = (actor.type == "coin" ? 2 : 1) * scale;
            this.cx.drawImage(otherSprites, tileX, 0, width, height, x, y, width, height);
        }
    }, this);
};

function flipHorizontally(context, around) {
    context.translate(around, 0);
    context.scale(-1, 1);
    context.translate(-around, 0);
}

// @TODO Fix Overlay Displays with CanvasDisplay method.
CanvasDisplay.prototype.createOverlay = function() {};

