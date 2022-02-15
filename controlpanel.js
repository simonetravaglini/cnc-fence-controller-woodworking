// TODO: handle clear log menu
// TODO: handle clear queue menu
// TODO: handle clear ack menu

/**
 * The controller for the control panel.
 */
app.controller('controlPanelCtrl', function($scope, $timeout,
    hotkeys, settingsService, machineService) {
  $scope.emergencyStop = machineService.emergencyStop;
  $scope.settings = settingsService.settings;
  $scope.machineService = machineService;
  $scope.logs = machineService.logs.slice();

  $scope.stepSize = 1;
  $scope.movement = 1;
  $scope.abmovement = 0;
  $scope.realposition = 0;
  // Rendering takes a lot of time, so only update the logs from the source of
  // truth every once in a while.
  var debounce = null;
  $scope.$watch(
    function() {return machineService.logs;},
    function(newValue, oldValue) {
      if (!debounce) {
        debounce = $timeout(function() {
          // Set the logs that we render to a _copy_ of the current logs.
          $scope.logs = newValue.slice();
          debounce = null;
        }, 200);
      }
    }, true);

  hotkeys.bindTo($scope)
    .add({
      combo: ['up', 'i'],
      description: 'move the Y axis in the + direction',
      callback: function() {$scope.relativeMove("Y")}
    })
    .add({
      combo: ['down' ,'k'],
      description: 'move the Y axis in the - direction',
      callback: function() {$scope.relativeMove("Y-")}
    })
    .add({
      combo: ['left', 'j'],
      description: 'move the X axis in the - direction',
      callback: function() {$scope.relativeMove("X-")}
    })
    .add({
      combo: ['right', 'l'],
      description: 'move the X axis in the + direction',
      callback: function() {$scope.relativeMove("X")}
    })
    .add({
      combo: ['a'],
      description: 'move the Z axis in the + direction',
      callback: function() {$scope.relativeMove("Z")}
    })
    .add({
      combo: ['z'],
      description: 'move the Z axis in the - direction',
      callback: function() {$scope.relativeMove("Z-")}
    })
    .add({
      combo: '-',
      description: 'decrement the step size',
      callback: function() {$scope.incrementStepSize(-1)}
    })
    .add({
      combo: '=',
      description: 'increment the step size',
      callback: function() {$scope.incrementStepSize(1)}
    })
    .add({
      combo: '/',
      description: 'focus the manual command entry',
      callback: function() {
        // Let the event finish propagating.
        $timeout(function() {
          $("#input-control-cmd").focus();
        }, 1);
      }
    });

  // The manual input field has to be configured manually.
  // The history of manual commands that the user has entered.
  var manualInputHistory = [];
  var manualInputPosition = 0;

  $scope.manualCommand = "";
  $scope.sendManualCommand = function(command) {
    manualInputHistory.push(command);
    manualInputPosition = manualInputHistory.length;
    machineService.enqueueCommands([command + '\n']);
    $scope.manualCommand = "";
  }

  $("#input-control-cmd").keydown(function(e) {
    e.stopPropagation();

    if (e.keyCode == 27) { // escape; blur the manual command input.
      // the delay is to allow the current event propagation to finish.
      $timeout(function() {
        $("#input-control-cmd").blur();
      }, 1);

    } else if (e.keyCode == 38) { // up arrow; show previous history position.
      manualInputPosition = Math.max(manualInputPosition - 1, 0);
      var prevCommand = ((manualInputPosition < manualInputHistory.length) ?
          manualInputHistory[manualInputPosition] : "");
      $scope.manualCommand = prevCommand;
      $timeout(function() {
        $("#input-control-cmd")[0].setSelectionRange(prevCommand.length, prevCommand.length);
      }, 1);
    } else if (e.keyCode == 40) { // down arrow; show next history position.
      manualInputPosition = Math.min(manualInputPosition + 1, manualInputHistory.length);
      var nextCommand = ((manualInputPosition < manualInputHistory.length) ?
          manualInputHistory[manualInputPosition] : "");
      $scope.manualCommand = nextCommand;
      $timeout(function() {
        $("#input-control-cmd")[0].setSelectionRange(nextCommand.length, nextCommand.length);
      }, 1);
    }
  });

  var shouldSendCommands = function() {
    return machineService.isConnected && machineService.commandQueue.length == 0;
  }

  $scope.getStepSize = function() {
    return Math.pow(10, $scope.stepSize);
  }

  $scope.incrementStepSize = function(amt) {
    $scope.stepSize = Math.max(-1, Math.min(3, $scope.stepSize + amt));
  }
  
  $scope.incrementmovement = function(qt) {
    $scope.movement = $scope.movement + qt ;
  /* Aggiungere controllo che non vada sotto lo 0 assoluto e sopra il massimo impostato nei settings */
  
  }
  
  $scope.incrementmovementab = function(abqt) {
    $scope.abmovement = $scope.abmovement + abqt ;
    if  ($scope.abmovement < 0) {$scope.abmovement = 0}
    if ($scope.abmovement > settingsService.settings.workspace_width_mm) {
    $scope.abmovement = settingsService.settings.workspace_width_mm;
    $scope.realposition = settingsService.settings.workspace_width_mm;
    }

  }
  
  $scope.setrealposition = function(addsub) {
  $scope.realposition =  $scope.realposition + addsub ;
  
  }
      
   $scope.abmovequalrealpos = function() {
    $scope.abmovement = $scope.realposition;
  }

  $scope.realposequalabmov = function() {
     $scope.realposition = $scope.abmovement;
  }


  /**
   * Enqueue a command to perform a relative move. The global step size
   * will be used.
   *
   * @param {string} axis The axis to move about (eg. 'X-')
   */
  $scope.relativeMove = function(axis) {
    if (!shouldSendCommands()) {
      return;
    }

    var commands = [];
    if (!machineService.isRelativeMode) {
      commands.push("G91\n");
    }
    if (!machineService.isMm) {
      commands.push("G21\n");
    }

    var feedrate = settingsService.settings.workspace_jog_feedrate;
    var mv = "G1";
    if (settingsService.settings.workspace_jog_rapid) {
      mv = "G0"
    } else if (feedrate != NaN && feedrate > 0) {
      mv += " F" + feedrate;
    }
    mv += " " + axis + $scope.getStepSize();
    commands.push(mv + '\n');

    machineService.enqueueCommands(commands);
  };

 $scope.absoluteMove = function(axis) { 
    if (!shouldSendCommands()) {
      return;
    }

    
  
    
    var commands = [];
    
    commands.push("G90\n");
  
    if (!machineService.isMm) {
      commands.push("G21\n");
    }

    var feedrate = settingsService.settings.workspace_jog_feedrate;
    var mv = "G1";
    if (settingsService.settings.workspace_jog_rapid) {
      mv = "G0"
    } else if (feedrate != NaN && feedrate > 0) {
      mv += " F" + feedrate;
    }
    mv += " " + axis + $scope.abmovement;
    commands.push(mv + '\n');

    machineService.enqueueCommands(commands);
  };
 
 $scope.relativeMove2 = function(axis) {
    if (!shouldSendCommands()) {
      return;
    }

    var commands = [];
    
    commands.push("G91\n");
   
    if (!machineService.isMm) {
      commands.push("G21\n");
    }

    var feedrate = settingsService.settings.workspace_jog_feedrate;
    var mv = "G1";
    if (settingsService.settings.workspace_jog_rapid) {
      mv = "G0"
    } else if (feedrate != NaN && feedrate > 0) {
      mv += " F" + feedrate;
    }
    mv += " " + axis + $scope.movement;
    commands.push(mv + '\n');

    machineService.enqueueCommands(commands);
  };
 
 
 
 
 
 
  $scope.sendCommands = function(cmds) {
    if (!shouldSendCommands()) {
      return;
    }
    machineService.enqueueCommands(cmds);
  }

  // Update the size of various elements to fill the screen.
  var resize = function() {
    var anchor = document.getElementById("bottom-tracker-logs");
    var elem = document.getElementById("console-log");
    elem.style.setProperty("height", (anchor.getBoundingClientRect().top -
        elem.getBoundingClientRect().top) + "px");
  };
  $scope.$on('resize', resize);
  resize();
});
