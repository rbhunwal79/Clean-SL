/**********************************************************************************************
    Clean SL.jsx
    Copyright (c) 2017 Tomas Šinkūnas. All rights reserved.
    www.rendertom.com

    Description:
		Clean SL (Clean ScriptingListenerJS.log) is a utility tool for Adobe Photoshop
		to clean up ScriptingListenerJS.log file. Script performs multiple actions such
		as cleaning-up variable names and hoisting them to the top, wraps code block
		into function, converts charID to string ID for better readability and such.
		Resulting code is clean and maintains better code readability.

	Features:
		- Load entire ScriptingListenerJS.log content
		- Load only last entry in ScriptingListenerJS.log
		- Enter ScriptingListenerJS code manually

	Options:
		- Hoist variable declaration to the top
		- Consolidate variables
		- Give descriptive variable names
		- Convert charID to stringID for better readability
		- Replace stringIDToTypeID() to s2t() function
		- Wrap to function block.

	Released as open-source under the MIT license:
		The MIT License (MIT)
		Copyright (c) 2017 Tomas Šinkūnas www.renderTom.com
		Permission is hereby granted, free of charge, to any person obtaining a copy of this
		software and associated documentation files (the "Software"), to deal in the Software
		without restriction, including without limitation the rights to use, copy, modify, merge,
		publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
		to whom the Software is furnished to do so, subject to the following conditions:

		The above copyright notice and this permission notice shall be included in all copies or
		substantial portions of the Software.

		THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
		INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
		PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
		FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
		OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
		DEALINGS IN THE SOFTWARE.

**********************************************************************************************/

(function () {

	//@include "lib/json2.js"

	var script = {
		name: "Clean ScriptingListenerJS.log",
		nameShort: "Clean SL",
		version: "1.2-beta.2",
		developer: {
			name: File.decode("Tomas%20%C5%A0ink%C5%ABnas"), // Tomas Šinkūnas
			url: "http://www.rendertom.com"
		},
		getInfo: function () {
			return this.nameShort + " v" + this.version + "\n" + "Photoshop utility tool to clean " +
				"up ScriptingListenerJS log file. Script performs multiple actions such as cleaning-up " +
				"variable names and hoisting them to the top, wraps code block into function, " +
				"converts charID to string ID for better readability and such. \n\n" +
				"Resulting code is clean and maintains better readability.\n\n" +
				"Developed by " + this.developer.name + "\n" + this.developer.url;
		}
	};

	var logSeparator = "// =======================================================\n";

	var junkArray = [
		"stringIDToTypeID( \"convertJSONdescriptor\" );",
		"stringIDToTypeID( \"invokeCommand\" );",
		"stringIDToTypeID( \"modalHTMLPending\" );",
		"stringIDToTypeID( \"modalStateChanged\" );",
		"stringIDToTypeID( \"toggleSearch\" );",
		"stringIDToTypeID( \"toolModalStateChanged\" );"
	];

	var Incrementor = (function () {
		var storedVariables = [],
			storedFunctions = [];

		function contains(arr, value) {
			var i, il;
			for (i = 0, il = arr.length; i < il; i++) {
				if (arr[i] === value) {
					return arr[i];
				}
			}
			return false;
		}

		function resetVariables() {
			storedVariables = [];
		}

		function resetFunctions() {
			storedFunctions = [];
		}

		function incrementVariables(string) {
			return increment(string, storedVariables);
		}

		function incrementFunctions(string) {
			var functionName = string;
			functionName = validateFunctionName(string);
			return increment(functionName, storedFunctions);
		}

		function increment(string, storedArray) {
			var coreName, newVariableVersion, versionNumber;

			coreName = string.replace(/\d+$/, "");
			newVariableVersion = coreName;
			versionNumber = 2;
			while (contains(storedArray, newVariableVersion)) {
				newVariableVersion = coreName + versionNumber;
				versionNumber++;
			}

			storedArray.push(newVariableVersion);
			return newVariableVersion;
		}

		function validateFunctionName(string) {
			var functionName = string;
			functionName = functionName.replace(/[^a-z0-9_\$]/gi, ""); // Remove forbidden characters from function names
			if (functionName === "")
				functionName = "xxx";

			return functionName;
		}

		return {
			resetVariables: resetVariables,
			resetFunctions: resetFunctions,
			incrementVariables: incrementVariables,
			incrementFunctions: incrementFunctions
		};
	})();

	var Settings = (function () {
		var settings, defaultSettings, startupSettings,
			pathToSettingsFile;

		pathToSettingsFile = File($.fileName).parent.fsName + "/" + "Clean SL Settings.txt";
		defaultSettings = {
			hoistVariables: {
				value: true
			},
			consolidateVariables: {
				value: true
			},
			descriptiveNames: {
				value: true
			},
			charIDToStringID: {
				value: true
			},
			shortStringID: {
				value: true
			},
			wrapToFunction: {
				value: true
			},
			closeBeforeEval: {
				value: true
			},
			saveOnQuit: {
				value: true
			},
			etInputText: {
				text: ""
			},
			etOutputText: {
				text: ""
			}
		};

		function copyObjectValues(sourceObject, targetObject) {
			for (var propertyName in sourceObject) {
				if (!sourceObject.hasOwnProperty(propertyName) ||
					!targetObject.hasOwnProperty(propertyName)) {
					continue;
				}

				for (var deepPropertyName in sourceObject[propertyName]) {
					if (!sourceObject[propertyName].hasOwnProperty(deepPropertyName) ||
						!targetObject[propertyName].hasOwnProperty(deepPropertyName)) {
						continue;
					}
					targetObject[propertyName][deepPropertyName] = sourceObject[propertyName][deepPropertyName];
				}
			}
		}

		function writeFile(fileObj, fileContent, encoding) {
			encoding = encoding || "utf-8";
			fileObj = (fileObj instanceof File) ? fileObj : new File(fileObj);

			var parentFolder = fileObj.parent;
			if (!parentFolder.exists && !parentFolder.create())
				throw new Error("Cannot create file in path " + fileObj.fsName);

			fileObj.encoding = encoding;
			fileObj.open("w");
			fileObj.write(fileContent);
			fileObj.close();

			return fileObj;
		}

		function readFileContent(fileObj, encoding) {
			var fileContent;
			fileObj.open("r");
			fileObj.encoding = encoding || "utf-8";
			fileContent = fileObj.read();
			fileObj.close();
			return fileContent;
		}

		function getSettingsFromFile() {
			var settingsFile, fileContent, settingsJson;

			settingsFile = new File(pathToSettingsFile);
			if (!settingsFile.exists) {
				return null;
			}

			fileContent = readFileContent(settingsFile);

			try {
				settingsJson = JSON.parse(fileContent);
			} catch (e) {
				alert("Unable to parse settings file. Will use default values instead");
			}

			return settingsJson;
		}

		function save(data) {
			var settingsFile, settingsAsString;
			try {
				settingsFile = new File(pathToSettingsFile);
				settingsAsString = JSON.stringify(data, false, 4);

				writeFile(settingsFile, settingsAsString);

			} catch (e) {
				alert(e.toString() + "\nLine: " + e.line.toString());
			}
		}

		function saveSettings() {
			save(settings);
		}

		function saveStartupSettings() {
			startupSettings.saveOnQuit.value = false;
			save(startupSettings);
		}

		function init() {
			settings = getSettingsFromFile();
			if (!settings) {
				settings = defaultSettings;
			}

			startupSettings = JSON.parse(JSON.stringify(settings))
			return settings;
		}

		return {
			saveSettings: saveSettings,
			saveStartupSettings: saveStartupSettings,
			init: init,
			copyObjectValues: copyObjectValues,
		}
	})();

	var settings = Settings.init();

	buidUI();

	/* MAIN */

	function preprocess(dirtyCode) {
		var cleanCode, cleanCodeBlock, cleanCodeArray = [],
			dirtyCodeBlock, dirtyCodeArray = [],
			i, il;

		Incrementor.resetFunctions();

		dirtyCodeArray = dirtyCode.split(logSeparator);
		for (i = 0, il = dirtyCodeArray.length; i < il; i++) {
			Incrementor.resetVariables();

			dirtyCodeBlock = trimSpaces(dirtyCodeArray[i]);
			if (dirtyCodeBlock === "") continue;
			cleanCodeBlock = main(dirtyCodeBlock);
			cleanCodeArray.push(cleanCodeBlock);
		}

		cleanCode = (il === 1) ? "" : logSeparator;
		cleanCode = cleanCode + cleanCodeArray.join("\n\n" + logSeparator);

		return cleanCode;
	}

	function main(inString) {
		try {
			var string;

			string = inString;
			string = splitToNewLines(string);
			string = fixIndentation(string);
			string = fixTripleQuotes(string);

			if (settings.hoistVariables.value) string = hoistVariables(string);
			if (settings.consolidateVariables.value) string = consolidateVariables(string);
			if (settings.descriptiveNames.value) string = descriptiveNames(string);
			if (settings.charIDToStringID.value) string = convert_CharID_to_StringID(string);
			if (settings.shortStringID.value) string = shorten_stringIDToTypeID(string);
			if (settings.wrapToFunction.value) string = wrapToFunction(string);

			return string;

		} catch (e) {
			alert(e.toString() + "\nLine: " + e.line.toString());
		}
	}

	/********************************************************************************/



	/* WORKFLOW */

	function hoistVariables(inString) {
		var outString, variableDeclarationLines = [],
			i, il;

		outString = inString;
		variableDeclarationLines = getVariableDeclarationLines(outString);

		if (variableDeclarationLines) {
			for (i = 0, il = variableDeclarationLines.length; i < il; i++) {
				outString = outString.replace(variableDeclarationLines[i] + "\n", ""); // remove from original position
			}
			// We have to separate "removing" and "adding" lines,
			// because if it adds variableDeclaration line, it might get removed
			outString = variableDeclarationLines.join("\n") + "\n\n" + outString;
		}

		return trimSpaces(outString);
	}

	function consolidateVariables(inString) {
		var outString,
			variableName,
			variableValue,
			variableDeclarationLine,
			variableDeclarationLines,
			regexPattern,
			regexExpression,
			variablesInCodeBlock,
			lastSign,
			i, il, j, jl;

		outString = inString;
		variableDeclarationLines = getVariableDeclarationLines(outString);

		if (variableDeclarationLines) {
			for (i = 0, il = variableDeclarationLines.length; i < il; i++) {
				variableDeclarationLine = variableDeclarationLines[i];

				// ignore lines with "new ActionDescriptor()", "new ActionList()" and such,
				// because we don't want to consolidate them.
				if (variableDeclarationLine.match("\\s*new.*\\(\\)")) continue;

				variableName = getVariableName(variableDeclarationLine);
				variableValue = getVariableValue(variableDeclarationLine);

				// Adds "," or ")" to variable name, so I could capture variables
				// used in code (and not in variable declaration block);
				regexPattern = variableName + "\\s*[,|\\)]";

				variablesInCodeBlock = outString.match(new RegExp(regexPattern, "g"));
				if (variablesInCodeBlock) {
					for (j = 0, jl = variablesInCodeBlock.length; j < jl; j++) {
						// Determines what last character was : "," or ")";
						lastSign = variablesInCodeBlock[j].slice(-1);
						outString = outString.replace(variablesInCodeBlock[j], variableValue + lastSign);
					}

					// Remove variable declaration lines. We have to use Global flag
					// because in some case there are duplicate declarations of same variable
					regexExpression = new RegExp(escapeRegexExpression(variableDeclarationLine + "\n"), "g");
					outString = outString.replace(regexExpression, "");
				}
			}
		}

		return outString;
	}

	function descriptiveNames(inString) {
		var outString,
			constructorName,
			variableName,
			variableNameNew,
			variableValue,
			variableDeclarationLine,
			variableDeclarationLines = [],
			namesObject = [{
				constructorName: "ActionDescriptor",
				variableName: "descriptor"
			}, {
				constructorName: "ActionList",
				variableName: "list"
			}, {
				constructorName: "ActionReference",
				variableName: "reference"
			}, ],
			i, il, j, jl;


		outString = inString;
		variableDeclarationLines = getVariableDeclarationLines(outString);

		if (variableDeclarationLines) {
			for (i = 0, il = variableDeclarationLines.length; i < il; i++) {
				variableDeclarationLine = variableDeclarationLines[i];

				variableName = getVariableName(variableDeclarationLine);
				variableValue = getVariableValue(variableDeclarationLine);
				variableNameNew = variableName;

				for (j = 0, jl = namesObject.length; j < jl; j++) {
					if (variableValue.match(namesObject[j].constructorName)) {
						variableNameNew = namesObject[j].variableName;
						break;
					}
				}

				variableNameNew = Incrementor.incrementVariables(variableNameNew);
				outString = outString.replace(new RegExp(variableName, "g"), variableNameNew);
			}
		}

		return outString;
	}

	function convert_CharID_to_StringID(inString) {
		var outString,
			regexPattern,
			charIDWithQuotes,
			charIDWithoutQuotes,
			charIDArray = [],
			stringID,
			stringIDwithQuetes,
			i, il;


		outString = inString;
		regexPattern = "[\"|'][\\w\\s]{4}[\"|']"; // Matches any 4 characters between quotes
		charIDArray = outString.match(new RegExp(regexPattern, "g"));

		if (charIDArray) {
			for (i = 0, il = charIDArray.length; i < il; i++) {
				charIDWithQuotes = trimSpaces(charIDArray[i]);
				charIDWithoutQuotes = charIDWithQuotes.slice(1, -1);
				stringID = charIDtoStringID(charIDWithoutQuotes);
				stringIDwithQuetes = "\"" + stringID + "\"";
				outString = outString.replace(charIDWithQuotes, stringIDwithQuetes);
			}
			outString = outString.replace(/charIDToTypeID/g, "stringIDToTypeID");
		}
		return outString;
	}

	function shorten_stringIDToTypeID(inString) {
		var outString, functionDeclarationString,
			regexPattern, regexExpression;

		outString = inString;
		functionDeclarationString = "var s2t = function (s) {\n\treturn app.stringIDToTypeID(s);\n};";
		regexPattern = "stringIDToTypeID";
		regexExpression = new RegExp(regexPattern, "g");

		if (regexExpression.test(outString)) {
			outString = outString.replace(regexExpression, "s2t");
			outString = functionDeclarationString + "\n\n" + outString;
		}

		return outString;
	}

	function wrapToFunction(inString) {
		var outString,
			functionName,
			functionBlock,
			functionNameFromExecuteAction,
			executeActionLine;

		outString = inString;
		functionName = "xxx";
		executeActionLine = outString.match(/executeAction.*/);
		if (executeActionLine) {
			functionNameFromExecuteAction = executeActionLine[0].split("\"")[1];
			if (functionNameFromExecuteAction) {
				functionName = functionNameFromExecuteAction;
			}
		}

		functionName = Incrementor.incrementFunctions(functionName);
		functionBlock = functionName + "();\n" + "function " + functionName + "() {\n";
		outString = functionBlock + fixIndentation(outString, "\t", false) + "\n}";

		return outString;
	}

	function evaluateScript(codeAsString) {
		try {
			eval(codeAsString);
		} catch (e) {
			alert("Unable to evalue script.\n" + e.toString() + "\nLine: " + e.line.toString());
		}
	}

	function removeJunkCode(inString) {
		try {
			var cleanCode, cleanCodeArray = [],
				dirtyCode, dirtyCodeArray = [],
				isJunkBlock, numberJunksRemoved = 0,
				alertMessage, i, il;

			dirtyCodeArray = trimSpaces(inString).split(logSeparator);

			for (i = 0, il = dirtyCodeArray.length; i < il; i++) {
				dirtyCode = dirtyCodeArray[i];
				if (trimSpaces(dirtyCode) === "") continue;
				isJunkBlock = stringContainsArrayItems(dirtyCode, junkArray);
				if (isJunkBlock) {
					numberJunksRemoved++;
				} else {
					cleanCodeArray.push(dirtyCode);
				}
			}

			if (numberJunksRemoved === 0) {
				alertMessage = "All good, no junk found.";
				cleanCode = false;
			} else {
				alertMessage = "Removed " + numberJunksRemoved + " junk " + ((numberJunksRemoved > 1) ? "blocks" : "block") + ".\n";
				alertMessage += "\"Junk block\" is considered a log block that contains any of these:\n\n" + junkArray.join("\n");

				if (cleanCodeArray.length === 0) {
					cleanCode = " ";
				} else {
					cleanCode = (cleanCodeArray.length === 1) ? "" : logSeparator;
					cleanCode = logSeparator + cleanCodeArray.join(logSeparator);
				}
			}

			alert(alertMessage);

			return cleanCode;

		} catch (e) {
			alert(e.toString() + "\nLine: " + e.line.toString());
		}
	}

	/********************************************************************************/



	/* USER INTERFACE */

	function buidUI() {
		var uiControlls = {};
		var win = new Window("dialog", script.name + " v" + script.version, undefined, {
			resizeable: true
		});
		win.preferredSize = [1100, 500];
		win.alignChildren = ["fill", "fill"];
		win.orientation = "row";


		uiControlls.etInputText = win.add("edittext", undefined, "", {
			multiline: true
		});

		uiControlls.etInputText.onChange = uiControlls.etInputText.onChanging = function () {
			btnExecSource.enabled = btnCleanCode.enabled = btnRemoveJunkCode.enabled = this.text !== "";
		};

		uiControlls.etOutputText = win.add("edittext", undefined, "", {
			multiline: true
		});

		uiControlls.etOutputText.onChange = uiControlls.etOutputText.onChanging = function () {
			btnSave.enabled = btnExecOutput.enabled = this.text !== "";
		};


		var grpRightColumn = win.add("group");
		grpRightColumn.orientation = "column";
		grpRightColumn.alignment = ["right", "fill"];
		grpRightColumn.alignChildren = ["fill", "top"];
		grpRightColumn.spacing = 2;

		var btnReadFullLog = grpRightColumn.add("button", undefined, "Load full log");
		btnReadFullLog.onClick = function () {
			var fullLog = getFullLog();
			if (fullLog) {
				uiControlls.etInputText.text = trimSpaces(fullLog);
				uiControlls.etInputText.onChanging();
			}
		};

		var btnReadLastLog = grpRightColumn.add("button", undefined, "Load last log entry");
		btnReadLastLog.onClick = function () {
			var lastLogEntry = getLastLogEntry();
			if (lastLogEntry) {
				uiControlls.etInputText.text = lastLogEntry;
				uiControlls.etInputText.onChanging();
			}
		};

		var btnRemoveJunkCode = grpRightColumn.add("button", undefined, "Remove Junk Code");
		btnRemoveJunkCode.helpTip = "\"Junk block\" is considered a log block that contains any of these:\n\n" + junkArray.join("\n");
		btnRemoveJunkCode.onClick = function () {
			var cleanCode = removeJunkCode(uiControlls.etInputText.text);
			if (cleanCode) {
				uiControlls.etInputText.text = trimSpaces(cleanCode);
				uiControlls.etInputText.onChanging();
			}
		};

		var btnExecSource = grpRightColumn.add("button", undefined, "Evaluate source");
		btnExecSource.onClick = function () {
			if (uiControlls.closeBeforeEval.value === true) win.close();
			evaluateScript(uiControlls.etInputText.text);
		};

		addSpace(grpRightColumn, 20);

		uiControlls.hoistVariables = grpRightColumn.add("checkbox", undefined, "Hoist variables to the top"),
			uiControlls.consolidateVariables = grpRightColumn.add("checkbox", undefined, "Consolidate variables"),
			uiControlls.descriptiveNames = grpRightColumn.add("checkbox", undefined, "Descriptvive variable names"),
			uiControlls.charIDToStringID = grpRightColumn.add("checkbox", undefined, "Convert charID to stringID"),
			uiControlls.shortStringID = grpRightColumn.add("checkbox", undefined, "Shorten stringIDToTypeID"),
			uiControlls.wrapToFunction = grpRightColumn.add("checkbox", undefined, "Wrap to function block"),

			addSpace(grpRightColumn, 10);

		uiControlls.closeBeforeEval = grpRightColumn.add("checkbox", undefined, "Close before evaluating");
		uiControlls.saveOnQuit = grpRightColumn.add("checkbox", undefined, "Save UI data on quit");

		addSpace(grpRightColumn, 20);

		var btnCleanCode = grpRightColumn.add("button", undefined, "Clean Code");
		btnCleanCode.onClick = function () {
			Settings.copyObjectValues(uiControlls, settings);

			var finalCode = preprocess(uiControlls.etInputText.text);
			if (finalCode) {
				uiControlls.etOutputText.text = finalCode;
				uiControlls.etOutputText.onChanging();
			}
		};

		var btnExecOutput = grpRightColumn.add("button", undefined, "Evaluate output");
		btnExecOutput.onClick = function () {
			if (uiControlls.closeBeforeEval.value === true) win.close();
			evaluateScript(uiControlls.etOutputText.text);
		};

		var btnSave = grpRightColumn.add("button", undefined, "Save output code");
		btnSave.onClick = function () {
			var pathToFile = File.saveDialog("Save output code.");
			if (pathToFile) {
				saveFile(pathToFile, "jsx", uiControlls.etOutputText.text);
			}
		};

		var btnInfo = grpRightColumn.add("button", undefined, "About");
		btnInfo.alignment = ["fill", "bottom"];
		btnInfo.onClick = function () {
			alert(script.getInfo());
		};

		var btnClose = grpRightColumn.add("button", undefined, "Close");
		btnClose.alignment = ["fill", "bottom"];
		btnClose.onClick = function () {
			win.close();
		};

		win.onResizing = win.onResize = function () {
			this.layout.resize();
		};

		win.onShow = function () {

			Settings.copyObjectValues(settings, uiControlls);

			btnCleanCode.size.height = btnCleanCode.size.height * 1.5;
			uiControlls.etOutputText.onChanging();
			uiControlls.etInputText.onChanging();

			win.layout.layout(true);
		};

		win.onClose = function () {
			try {
				if (uiControlls.saveOnQuit.value === true) {
					Settings.copyObjectValues(uiControlls, settings);
					Settings.saveSettings();
				} else {
					Settings.saveStartupSettings();
				}
			} catch (e) {
				alert(e.toString() + "\nLine: " + e.line.toString());
			}
		};

		win.center();
		win.show();

		function addSpace(groupContainer, spaceSize) {
			var grpSpacer = groupContainer.add("group");
			grpSpacer.preferredSize.height = spaceSize;
		}
	}

	/********************************************************************************/



	/* HELPER FUNCTIONS */

	function getVariableName(string) {
		var variableName;

		// Split line by "=" and capture first part.
		// Remove "var" keyword and cleanup white spaces.
		variableName = string.split("=")[0];
		variableName = variableName.replace(/^\s*var/, "");
		variableName = trimSpaces(variableName);

		return variableName;
	}

	function getVariableValue(string) {
		var variableValue;

		// Split line by "=" and capture second part.
		// Remove ";" at the end and cleanup white spaces.
		variableValue = string.split("=")[1];
		variableValue = variableValue.replace(/;$/, "");
		variableValue = trimSpaces(variableValue);

		return variableValue;
	}

	function getLastLogEntry() {
		var fullLog, lastLog, logArray = [];

		fullLog = getFullLog();
		logArray = fullLog.split(logSeparator);
		lastLog = logArray.pop();
		lastLog = trimSpaces(lastLog);

		return lastLog;
	}

	function escapeRegexExpression(text) {
		return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	}

	function getVariableDeclarationLines(multilineString) {
		var regexPattern, regexFlag, regexExpression;

		regexPattern = "^\\s*var.+;$";
		regexFlag = "gm"; // Global, Multiline
		regexExpression = new RegExp(regexPattern, regexFlag);

		return multilineString.match(regexExpression);
	}

	function getFullLog() {
		var logFile;

		logFile = File(Folder.desktop.fsName + "/" + "ScriptingListenerJS.log");
		if (!logFile.exists) throw new Error("Unable to find Log file.\nFile does not exist at path " + logFile.fsName);

		return readFileContent(logFile);
	}

	function stringContainsArrayItems(string, array) {
		for (var i = 0, il = array.length; i < il; i++) {
			if (string.indexOf(array[i]) > -1)
				return true;
		}

		return false;
	}

	/********************************************************************************/



	/* STRING MANIPULATION */

	function trimSpaces(string) {
		return string.replace(/^\s+|\s+$/g, "");
	}

	function fixIndentation(inString, indentation, toTrim) {
		var outString, stringLine, stringsArray, i, il;

		if (typeof indentation === "undefined") indentation = "";
		if (typeof toTrim === "undefined") toTrim = true;

		outString = inString;
		stringsArray = outString.split("\n");

		for (i = 0, il = stringsArray.length; i < il; i++) {
			if (trimSpaces(stringsArray[i]) === "") continue;

			stringLine = (toTrim === true) ? trimSpaces(stringsArray[i]) : stringsArray[i];
			stringsArray[i] = indentation + stringLine;
		}

		outString = stringsArray.join("\n");

		return outString;
	}

	function fixTripleQuotes(string) {
		return string.replace(/"""/g, "\"");
	}

	function splitToNewLines(inString, separator) {
		var outString;

		separator = separator || ";";

		outString = inString;
		outString = outString.replace(new RegExp(separator, "g"), separator + "\n");
		outString = outString.replace(/\n\s*\n/g, "\n"); // remove double-returns

		return outString;
	}

	function charIDtoStringID(charID) {
		try {
			return typeIDToStringID(charIDToTypeID(charID));
		} catch (e) {
			alert("Unable to convert \"" + charID + "\" to StringID\n" + e.toString() + "\nLine: " + e.line.toString() + "\n" + charID);
			return charID;
		}
	}

	/********************************************************************************/



	/* FILE */

	function readFileContent(fileObj, encoding) {
		var fileContent;
		fileObj.open("r");
		fileObj.encoding = encoding || "utf-8";
		fileContent = fileObj.read();
		fileObj.close();
		return fileContent;
	}

	function saveFile(fileObject, fileExtension, fileContents) {
		var filePath, newPath;

		filePath = fileObject.toString();
		if (filePath.lastIndexOf(".") < 0) {
			newPath = filePath + "." + fileExtension;
		} else {
			newPath = filePath.substr(0, filePath.lastIndexOf(".")) + "." + fileExtension;
		}

		fileObject = File(newPath);
		fileObject.open("W");
		fileObject.encoding = "utf-8";
		fileObject.write(fileContents);
		fileObject.close();
	}
})();