'use strict';

module.exports = (NODE) => {
  const childProcess = require('child_process');

  const triggerIn = NODE.getInputByName('trigger');
  const commandsIn = NODE.getInputByName('commands');
  const cwdsIn = NODE.getInputByName('cwds');

  const doneOut = NODE.getOutputByName('done');
  const stdOut = NODE.getOutputByName('stdout');
  const stdErr = NODE.getOutputByName('stderr');

  triggerIn.on('trigger', async (conn, state) => {
    const [commands, cwds] = await Promise.all([
      commandsIn.getValues(state),
      cwdsIn.getValues(state)
    ]);

    if (!cwds.length) {
      cwds.push(NODE.data.cwd);
    }

    if (!commands.length) {
      commands.push(NODE.data.command);
    }

    const callLength = cwds.length * commands.length;

    const stdOuts = [];
    const stdErrs = [];
    cwds.forEach((cwd) => {
      commands.forEach((command) => {
        childProcess.exec(command, { cwd, windowsHide: true }, (err, stdout, stderr) => {
          stdOuts.push(stdout);
          stdErrs.push(stderr);

          if (err) {
            NODE.error(err, state);
          }

          // all done
          if (stdOuts.length === callLength) {
            state.set(NODE, {
              stdOuts,
              stdErrs
            });
            doneOut.trigger(state);
          }
        });
      });
    });
  });

  stdOut.on('trigger', async (conn, state) => {
    const thisState = state.get(NODE);
    if (!thisState || !thisState.stdOuts) {
      return;
    }

    return thisState.stdOuts;
  });

  stdErr.on('trigger', async (conn, state) => {
    const thisState = state.get(NODE);
    if (!thisState || !thisState.stdErrs) {
      return;
    }

    return thisState.stdErrs;
  });
};
