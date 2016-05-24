
// Global UI elements _____________________________________________________________________________________________

tabris.ui.set("background", "red");
var composite = 0;
var statusText = 0;
var dataScrollView = 0;
var collectionView = 0;
var btGetDataButton = 0;
var waitingText = 0;
var MARGIN = 10;


var page = tabris.create("Page", {   // First Page 
  title: "Data Acquisition",
  Layout: "",
  topLevel: true
});

var tabFolder = new tabris.TabFolder({  // tab folder
  layoutData: {left: 0, top: 0, right: 0, bottom: 0},
  background: "red",
  textColor: "white",
  elevation: 4,
  paging: true // enables swiping. To still be able to open the developer console in iOS, swipe from the bottom right.
}).appendTo(page);

// Tabs __________________________________________________________________________________________________________________

var http_tab = new tabris.Tab({  // HTTP Tab
	title: "HTTP",
	image: "images/at.png",
	background: "white"
}).appendTo(tabFolder);

var bluetooth_tab = new tabris.Tab({ // Bluetooth Tab
	title: "Bluetooth",
	image: "images/bluetooth.png",
	background: "white"
}).appendTo(tabFolder);

// HTTP functionality ____________________________________________________________________________________________________
urlInput = new tabris.TextInput({  // show url input field
	layoutData: {top: 10, left: 10, right: 10},
	message: "Enter URL and confirm",
	text: "http://192.168.178.30:8080/db.json"
}).on("accept", function(widget, address){
	
	// dispose global widgets
	disposeGlobalWidgets();

	var xhr = new tabris.XMLHttpRequest();  // create XMLHttpRequest
	
	statusText = tabris.create("TextView",{
		layoutData: {left: 2 * MARGIN, right: 2 * MARGIN, top: [urlInput, MARGIN]},
		text: "",
		alignment: "center"
	}).appendTo(http_tab);
	
	xhr.onreadystatechange = function() {
					
		if (xhr.readyState === 4) { // ready for receiving response
			if(xhr.status === 200){	// success case, respone received
				displayData(xhr.responseText, urlInput, http_tab); // call the display fcn
			
			} else { // error case
				statusText.set("text", "URL invalid: " + xhr.status); 
			}
		}else{
			statusText.set("text", "Data request..."); 
		}
	};			

	xhr.open("GET", address);
	
	xhr.send();
}).appendTo(http_tab);

// Bluetooth functionality _______________________________________________________________________________________________

var btRadioButtons =  ["Scan for Devices", "Enter MAC / UUID"];
var bleEnableButton = 0;
var macInput = 0;

btRadioButtons.forEach(function(title) {
  new tabris.RadioButton({
    layoutData: {left: 10, top: "prev() 10", height: 20},
    text: title
  }).on("change:selection", function(widget, selection) {
		if (widget.get("text") == "Scan for Devices") {
			
			// dispose global widgets
			disposeGlobalWidgets("bleEnableButton");
			
			bluetoothSerial.enable(function(){
				bluetoothSerial.isEnabled(function(){
					scanBluetoothConnection();
				}, function(){
					;
				})
			}, function(){
				console.log("Couldn't enable Bluetooth!");
			});			
			
		}
		else if(widget.get("text") == "Enter MAC / UUID"){
			
			disposeGlobalWidgets();
			
			bluetoothSerial.enable(function(){
				bluetoothSerial.isEnabled(function(){
					manualBluetoothConnection();
				}, function(){
					;
				})
			}, function(){
				console.log("Couldn't enable Bluetooth!");
			});			
		}
	
	}).appendTo(bluetooth_tab);
});

// scan bt functionality with collectionView ___________
function scanBluetoothConnection(){

	// Scan button incl. functionality
	bleEnableButton = tabris.create("Button", {
		text: "Scan",
		textColor: "white",
		background: "red",
		layoutData: {right: MARGIN, top: MARGIN}
	}).on("select", function(){
		
		// dispose widgets
		disposeGlobalWidgets("bleEnableButton");
		
		bluetoothSerial.isEnabled(function(){
				// waiting text ...
			waitingText = new tabris.TextView({
				layoutData: {centerX: 0, centerY: 0},
				text: "Scanning for unpaired devices..."
			}).appendTo(bluetooth_tab);
			
			
			// discover unpaired bluetooth devices
			bluetoothSerial.discoverUnpaired(function(devices) {
			
				// disconnect any established connections
				bluetoothSerial.disconnect();
				
				// log the devices found
				console.log(devices.length + " Device(s) found!\n\n");
				
				// update waitingText if no devices could be found
				if(devices.length < 1){
					waitingText.set("text", "No devices found, try again!");
				}
				else{
					// dispose the waiting text
					waitingText.dispose();
				}
				
				// device variable
				var scannedDevices = [];
				
				// parse all devices found
				devices.forEach(function(device, i) {
					console.log("name: " + device.name + "\nID: " + device.id);
					scannedDevices[i] = [device.name, device.id]; // this means: scannedDevices[i][0] = name etc.
				})
				
				// create a collectionView for the devices found
				collectionView = new tabris.CollectionView({
					layoutData: {left: MARGIN, top: [bleEnableButton, 10], right: MARGIN, bottom: MARGIN},
					items: scannedDevices,
					itemHeight: 75,
					initializeCell: function(cell){
						var nameView = new tabris.TextView({
							// layoutData: {left: 20, top: [bleEnableButton, 20], right: 20},
							layoutData: {left: MARGIN, top: MARGIN / 4},
							background: "#cecece",
							alignment: "center"
						}).appendTo(cell);
						var idView = new tabris.TextView({
							layoutData: {left: MARGIN, top: [nameView, MARGIN / 4]},
							alignment: "center"
						}).appendTo(cell);
						cell.on("change:item", function(widget, item){
							nameView.set("text", "Name:\t" + item[0]);
							idView.set("text", "ID:\t" + item[1]);
						});	  
					}
				}).on("select", function(target, value) { 
					
					// outsourced function to connect to a device and reading its data
					connectToDevice(value[1], value[0]);
					
				}).appendTo(bluetooth_tab);
			
			}, function(){
				;// failure
			});
		}, function(){
			waitingText = new tabris.TextView({
				layoutData: {centerX: 0, centerY: 0},
				text: "Bluetooth isn't enabled! Activate it first!"
			}).appendTo(bluetooth_tab);
		});
		
	}).appendTo(bluetooth_tab);
	
}

// mac address / uuid  bt functionality ________________
function manualBluetoothConnection(){
	macInput = new tabris.TextInput({  // show mac / uuid input field
		layoutData: {top: "prev() 10", left: 10, right: 10},
		message: "Enter MAC Adress or UUID",
		text: "48:D7:05:BB:2B:0E"
	}).on("accept", function(widget, address){
	
		connectToDevice(address, address);
	
	}).appendTo(bluetooth_tab);
}

// connect to a bluetooth device______________________
function connectToDevice(adress, name){
	
	if(!adress){
		return -1;
	}
	if(!name){
		var name = "unknown device";
	}
	
	window.plugins.toast.showShortBottom("Connecting to " + name);
	
	// connect to the choosen device
	bluetoothSerial.connect(adress, function(success){
		console.log("Connection to " + name + " successful!");
		
		window.plugins.toast.showShortBottom("Connected to " + name);
		
		if(collectionView){	// dispose the collectionView
			collectionView.dispose();
		}
		if(bleEnableButton){ // dispose the scan button
			bleEnableButton.dispose();
		}
		if(macInput){ // dispose the macInput textInput
			macInput.dispose();
		}
		
		// get data button
		btGetDataButton = new tabris.Button({
			//text: "Read Data from " + value[0],
			text: "Read Data",
			textColor: "white",
			background: "red",
			layoutData: {top: MARGIN, right: MARGIN}
		}).on("select", function(){
		
			// dispose global widgets, except the btGetDataButton
			disposeGlobalWidgets("btGetDataButton");
			
			// read data from buffer
			bluetoothSerial.read(function(data){
				
				// log the received data
				console.log(data);
				
				// display the data in a scrollview
				if(displayData(data, btGetDataButton, bluetooth_tab) == -1){
					waitingText = new tabris.TextView({
						layoutData: {centerX: 0, centerY: 0},
						text: "Error reading data!"
					}).appendTo(bluetooth_tab);
				}
				
			}, function(failure){
				console.log("Error reading data from " + name);
			});
			
		}).appendTo(bluetooth_tab);
		
	}, function(failure){
		console.log("Connection to " + name + " failed!");
		window.plugins.toast.showLongBottom("Couldn't connect to " + name);
	});
	
	return 1;
}


// actions on tab change_____________________________________________________________________________________________________
tabFolder.on("change:selection", function(widget, tab) {
	if(tab.name == "HTTP"){
    	
	}
	else{ // bluetooth case
	  
	}
});

page.open();


// Display Data functionality _______________________________________________________________________________________________
var displayData=function(responseData, topWidgetObject, tabToAppendTo){  // Data Management

	var receivedData = 0;
	
	try{
		// create a variable to save the received object data
		receivedData = JSON.parse(responseData);
	}
	catch(error){
		console.log("Error parsing the received data: " + error);
		// throw an error ??!! HOWWW???!!
		return -1;
	}
	
	var stringData = "";
	// parse the received data 
	receivedData.forEach(function(s, i, o){
		stringData = stringData + receivedData[i].firstName + "\n" + receivedData[i].age + "\n\n";
	})

	composite = new tabris.Composite({
		  layoutData: {left: MARGIN, bottom: MARGIN, right: MARGIN},
		//  transform: {translationZ: 2},
		  background: "white"
	}).appendTo(tabToAppendTo);

	var drawButton = new tabris.Button({
		text: "Draw graph",
		textColor: "white",
		background: "red",
		layoutData: {left: MARGIN, centerY: 0}
	}).appendTo(composite);

	var chartPicker = new tabris.Picker({
		layoutData: {right: MARGIN, centerY: 0},
		textColor: "black",
		items: ["Bar", "Line", "Radar"] // "PolarArea", "Pie", "Doughnut"
	}).appendTo(composite);
	
	if(topWidgetObject) // 
	{
		// create a scrollview if the received data exceeds the display size
		dataScrollView = tabris.create("ScrollView", {
			left: MARGIN, right: MARGIN, top: [topWidgetObject, MARGIN], bottom: [composite, 2 * MARGIN],
			direction: "vertical",
			background: "white"
		}).appendTo(tabToAppendTo);
	}else{
		// create a scrollview if the received data exceeds the display size
		dataScrollView = tabris.create("ScrollView", {
			left: MARGIN, right: MARGIN, top: MARGIN, bottom: [composite, 2 * MARGIN],
			direction: "vertical",
			background: "white"
		}).appendTo(tabToAppendTo);	
	}
	
	var responseText = tabris.create("TextView", {
		layoutData: {left: 2 * MARGIN, right: 2 * MARGIN, top: [dataScrollView, 2 * MARGIN]},
		text: stringData
	}).appendTo(dataScrollView);

	drawButton.on("select", function(){
		// create a chart, offering the received data 
		createChart(receivedData, chartPicker.get("selection"));
	});
	
	return 1;
}

// Create Chart functionality _______________________________________________________________________________________________
function createChart(receivedData, chartType){  // Chart
	var Chart = require("./node_modules/chart.js/Chart.min.js");	
	
	var visuPage = new tabris.Page({title: "Data Visualization"});  	// create a non-toplevel page for data visualization
	
	var labels = [];
    var yData =[];
	
	receivedData.forEach(function(s,i,o){ 
		labels[i] = receivedData[i].firstName;
		yData[i] = receivedData[i].age;
	})
	
	// chart data according to chart.js
	var chartData = {
		labels: labels,
		datasets: [
		{
			label: "My first bar chart",
			fillColor: "rgba(220,220,220,0.2)",
			strokeColor: "rgba(220,220,220,1)",
			pointColor: "rgba(220,220,220,1)",
			pointStrokeColor: "#fff",
			pointHighlightFill: "#fff",
			pointHighlightStroke: "rgba(220,220,220,1)",
			data: yData
		}
		]
	};
	
	// create a canvas and submit its data to the chart.js-constructor to create a chart
	var canvas = new tabris.Canvas({
		layoutData: { left: MARGIN, top: MARGIN, right: MARGIN, bottom: MARGIN }
	}).on("resize", function(canvas, bounds) {
		// get the size of the canvas context
		var ctx = canvas.getContext("2d", bounds.width, bounds.height);
		
		// wraparound to scale with native pixels
		ctx.scale(1 / window.devicePixelRatio, 1 / window.devicePixelRatio);
		
		// create the chart using the chart.js-constructor
		new Chart(ctx)[chartType](chartData, {
			animation: true,
			showScale: true,
			showTooltips: false,
			scaleShowLabels: true
		});
	}).appendTo(visuPage);

	visuPage.open();
}

// Dispose Global Widgets _______________________________________________________________________________________________
function disposeGlobalWidgets(exception){
	
	if(!exception){
		var exception = 0;
	}
	
	// dispose widgets
	if(collectionView && exception != "collectionView"){
		collectionView.dispose();
	}
	if(btGetDataButton && exception != "btGetDataButton"){
		btGetDataButton.dispose();
	}
	if(waitingText && exception != "waitingText"){
		waitingText.dispose();
	}
	if(composite && exception != "composite"){
		composite.dispose();
	}
	if(dataScrollView && exception != "dataScrollView"){
		dataScrollView.dispose();
		dataScrollView = 0;
	}
	if(statusText && exception != "statusText"){
		statusText.dispose();
	}
	if(macInput && exception != "urlInput"){
		macInput.dispose();
	}
	if(bleEnableButton && exception != "bleEnableButton"){
		bleEnableButton.dispose();
	}
}