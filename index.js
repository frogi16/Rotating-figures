function hideElementBy(id)
{
	document.getElementById(id).style.display = 'none';
}

function showElementBy(id)
{
	document.getElementById(id).style.display = '';
}

function deg2rad(degrees)
{
	return degrees * (Math.PI / 180);
}

function generateRegularFigure(numberOfVertices, r)
{	
	var vertices = [];
	for(var i = 0; i < numberOfVertices; i++)
	{
		var angle = deg2rad( 360 / numberOfVertices * i );
		vertices.push( [ r * Math.cos(angle), r * Math.sin(angle) ] );
	}
	
	return vertices;
}

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

var canvasScroll = document.getElementById("canvasScroll");
var ctxScroll = canvasScroll.getContext("2d");

var t = 0;
var dt = 0.1;
var translation = 80;
var brushThickness = 1;

var x0 = 300;
var y0 = 300;
var r = 200;
var phi = 0;
var yPrev = undefined;
var yPrevS = undefined;

var thetaVertices = 0;
var thetaVerticesPrev = 0;

var verticesRightTriangle = [ [-80, 200], [-80, -200], [140, -200] ];
var verticesArrow = [ [190, -30], [50, 0], [190, 30], [-200, -0] ];
var verticesSpear = [ [90, 105], [95, 110], [100, 110], [130, 133], [140, 141], [150, 150], [141, 140], [133, 130], [110, 100], [110, 95], [105, 90], [-200, -200] ];

var verticesCircle = generateRegularFigure(32, 200);
var isRegularFigure = false;

var chosenFigure = verticesRightTriangle;
var transformedChosenFigure = chosenFigure;
var defaultStrokeStyle = "#000";
var defaultFillStyle = "#000";

var measureFields = false;
var measureErrorFor;
var errorStart;
var figureField;
var sineField;

function round(number, decimalPosition = 3)
{
	var pow = Math.pow(10, decimalPosition);
	return Math.round(number * pow) / pow;
}

function convertToString(number, decimalPosition = 3)
{
	return String(round(number, decimalPosition));
}

function moveContextHorizontally(ctxScroll, translation)
{
	ctxScroll.globalCompositeOperation = "copy";
	ctxScroll.drawImage(ctxScroll.canvas, translation, 0);
	ctxScroll.globalCompositeOperation = "source-over"
}

function ifLiesBetween(point, bound1, bound2)
{
	return (bound1 <= point && point <= bound2) || (bound1 >= point && point >= bound2);
}

function getTrailingPointPosition(vertices, drawStyle = defaultStrokeStyle)
{
	for(var i=0, len=vertices.length; i<len; i++)
	{
		var nextI = i < len-1 ? i+1 : 0;
		var x1 = vertices[i][0];
		var y1 = vertices[i][1];
		var x2 = vertices[nextI][0];
		var y2 = vertices[nextI][1];
		var dx = x2 - x1;
		var dy = y2 - y1;
		
		var m = ( y1 - x1 * Math.tan(phi) ) / ( dx * Math.tan(phi) - dy );
		var xt = x1 + m*dx;
		var yt = y1 + m*dy;
		
		if(ifLiesBetween(xt, x1, x2) && ifLiesBetween(yt, y1, y2) && xt*Math.cos(phi) >= 0)
		{
			drawFigure([ [x1, y1], [x2, y2] ], false, drawStyle)			
			drawCircle(x0 + xt, y0 + yt, 3, drawStyle, drawStyle);
			drawFigure([ [xt, yt], [xt+canvas.width, yt] ], false, drawStyle)		
			
			return [x0 + xt, y0 + yt];
		}
	}
	
	return 300;
}

function strokeWith(style, ctx)
{
	ctx.strokeStyle = style;
	ctx.stroke();
	ctx.strokeStyle = defaultStrokeStyle;
}

function fillWith(style, ctx)
{
	ctx.fillStyle = style;
	ctx.fill();
	ctx.fillStyle = defaultFillStyle;
}

function drawFigure(vertices, close = true, strokeStyle = defaultStrokeStyle)
{
	if(vertices.length < 1)
		return;
	
	ctx.beginPath();
	ctx.moveTo(x0 + vertices[0][0], y0 + vertices[0][1]);

	for(var i=1, len=vertices.length; i<len; i++)
		ctx.lineTo(x0 + vertices[i][0], y0 + vertices[i][1]);
	
	if(close)
		ctx.lineTo(x0 + vertices[0][0], y0 + vertices[0][1]);
	
	strokeWith(strokeStyle, ctx);
}

function drawVerticalLine(style = defaultFillStyle, horizontalShift = 0)
{
	ctxScroll.fillStyle = style;
	ctxScroll.fillRect( horizontalShift,0, 1, canvasScroll.height );
	ctxScroll.fillStyle = defaultFillStyle;
}

function drawCircle(x0, y0, r, strokeStyle = defaultStrokeStyle, fillStyle = defaultFillStyle)
{
	ctx.beginPath();
	ctx.arc(x0, y0, r, 0, 2 * Math.PI, false);
	fillWith(fillStyle, ctx);
}

function drawRay(x, y, phi, length = 100000, style = defaultStyle, context = ctx)
{
	context.beginPath();
	context.moveTo(x, y);
	var to = [x + Math.cos(phi) * length, y + Math.sin(phi) * length];
	context.lineTo(to[0], to[1]);
	strokeWith(style, context);
	return to;
}

var rotateVector = function(vec, ang)
{
    ang = ang * Math.PI / 180;
    var cos = Math.cos(ang);
    var sin = Math.sin(ang);
    return new Array(round(vec[0] * cos - vec[1] * sin, 4), round(vec[0] * sin + vec[1] * cos, 4));
}

function updateChosenFigureAngle()
{
	transformedChosenFigure = [];
	
	for(var i=0, len=chosenFigure.length; i<len; i++)
		transformedChosenFigure.push(rotateVector(chosenFigure[i], thetaVertices));
}

function getRayAngularVelocity()
{
	var angVel = document.getElementById('rayVelocity').value;
	return (angVel == "" ? 36 : Math.round(parseFloat(angVel)));
}

function getFigureAngularVelocity()
{
	var angVel = document.getElementById('angleVelocity').value;
	return (angVel == "" ? 0 : Math.round(parseFloat(angVel)));
}

function shouldRotateFigure()
{
	return getFigureAngularVelocity() != 0;
}

function getFigureAngle()
{
	var angle = document.getElementById('angle').value;
	return (angle == "" ? 0 : parseFloat(angle));
}

function gcd(x, y) {
	if ((typeof x !== 'number') || (typeof y !== 'number')) 
		return false;
	x = Math.abs(x);
	y = Math.abs(y);
	while(y)
	{
		var t = y;
		y = x % y;
		x = t;
	}
	return x;
}

function strikeOutMeasurementWindow()
{
	var measureWindowLength = Math.ceil( Math.sqrt(2) * (t - errorStart) * translation );
	var horizontalSpacing = 20;
	for(var toY = 0, i = 0; toY < canvasScroll.height + 10; i++)
		toY = drawRay(0, (i + 1)*horizontalSpacing, -45, measureWindowLength, "#FF0000", ctxScroll)[1];
}

function resetFieldComputation(measureFor)
{
	if(measureFields)
		strikeOutMeasurementWindow();
	
	drawVerticalLine();
	
	errorStart = t;
	figureField = 0;
	sineField = 0;
	measureFields = true;
	measureErrorFor = measureFor;
	
}

function resetFieldComputationRayPeriod()
{
	resetFieldComputation(360 / getRayAngularVelocity());
}

function resetFieldComputationCommonPeriod()
{
	if(!shouldRotateFigure())
		alert("Figura się obracać");
	else
	{
		var rayVelocity = getRayAngularVelocity();
		var figureVelocity = getFigureAngularVelocity();
		
		resetFieldComputation( 360 / gcd(rayVelocity, figureVelocity) );
	}
}

function updateFieldsAndError()
{
	ctxScroll.fillRect( 0, canvasScroll.height-1, dt * translation, 1 );
	ctxScroll.fillRect( 0, 0, dt * translation, 1 );
	
	figureField  += Math.abs(yPrev -y0)/r * dt * deg2rad(getRayAngularVelocity());
	
	var infoLines = ["czas: " + convertToString(t - errorStart),
					 "pole pod krzywą: " + convertToString(figureField)];
	
	document.getElementById('fieldComputationVal').innerText = infoLines[0] + "\n" + infoLines[1];
	
	if(isRegularFigure)
	{
		sineField += Math.abs(yPrevS-y0)/r * dt * deg2rad(getRayAngularVelocity());
		infoLines.push("pole pod sinusem: " + convertToString(sineField));
		infoLines.push("błąd: " + convertToString( Math.abs(figureField - sineField) ));
		document.getElementById('fieldComputationVal').innerText += "\n" + infoLines[2]+ "\n" + infoLines[3];
	}

	if(t - errorStart >= measureErrorFor)
	{
		measureFields = false;
		drawVerticalLine();
		
		ctxScroll.font = "bold 16px Arial";
		for(var i = 0, len = infoLines.length; i < len; i++)
			ctxScroll.fillText(infoLines[i], 6, 20 * i + 16);
	}
}

var prevTime;
var typicalFrame  = 0.016;
var smallestFrame = 0.014;
var longestFrame  = 0.050;

function loop(now)
{	
	requestAnimationFrame(loop);
	
	dt = (now - prevTime) / 1000;
	prevTime = now;

	if (isNaN(dt) || dt<smallestFrame) return;
    if (dt>longestFrame) dt = typicalFrame;
	
	moveContextHorizontally(ctxScroll, dt*translation);

	if(shouldRotateFigure())
		thetaVertices += getFigureAngularVelocity() * dt;
	else thetaVertices = getFigureAngle();
	
	if(thetaVertices != thetaVerticesPrev)
		updateChosenFigureAngle();
	
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	drawFigure(transformedChosenFigure);
	drawCircle(x0, y0, 1);
	
	var point = getTrailingPointPosition(transformedChosenFigure, "#F00");

	if(isRegularFigure)
	{
		drawFigure(verticesCircle);
		var pointSinus = getTrailingPointPosition(verticesCircle);
		var dyS = (isNaN(yPrevS) ? 1 : yPrevS - pointSinus[1]);
		ctxScroll.fillRect( 0, pointSinus[1], dt * translation * brushThickness, (Math.abs(dyS) < 1 ? 1 : dyS ) );
		drawFigure([[0, 0], [pointSinus[0] - x0, pointSinus[1] - y0]], false);
		
		yPrevS = pointSinus[1];
	}
	
	var dy = (yPrev == undefined ? 1 : yPrev - point[1]);
	ctxScroll.fillStyle = "#FF0000";
	ctxScroll.fillRect( 0, point[1], dt * translation * brushThickness, (Math.abs(dy) < 1 ? 1 : dy ) );
	ctxScroll.fillStyle = defaultFillStyle;
	
	drawFigure([[0, 0], [point[0] - x0, point[1] - y0]], false, "#FF0000");
	
	thetaVerticesPrev = thetaVertices;
	yPrev = point[1];

	if(measureFields)
		updateFieldsAndError();
	
	t += dt;		
	phi += dt * deg2rad(getRayAngularVelocity());
}

function changeFigureTo(vertices, isRegular = false)
{
	if(vertices.length < 3)
	{
		alert("Figura musi mieć co najmniej 3 wierzchołki");
		return;
	}
	
	isRegularFigure = isRegular;
	chosenFigure = vertices;
	transformedChosenFigure = chosenFigure;
	updateChosenFigureAngle();
	
	yPrev = undefined;
	yPrevS = undefined;
}

function changeFigureToRightTriangle()
{
	changeFigureTo(verticesRightTriangle);
}

function changeFigureToArrow()
{
	changeFigureTo(verticesArrow);
}

function changeFigureToSpear()
{
	changeFigureTo(verticesSpear);
}

function changeFigureToNewRegular()
{
	var verticesNumber = document.getElementById('verticesNumber').value;
	changeFigureTo(generateRegularFigure(verticesNumber, 200), true);
}

function onEnterChangeFigure(event)
{
    if (event.keyCode == 13) {
        changeFigureToNewRegular();
    }
}

ctxScroll.imageSmoothingEnabled = false;

document.getElementById('angle').onkeydown = onEnterChangeFigure;
document.getElementById('verticesNumber').onkeydown = onEnterChangeFigure;

requestAnimationFrame(loop);
