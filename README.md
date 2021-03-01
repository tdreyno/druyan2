# Fizz

[![Test Coverage](https://api.codeclimate.com/v1/badges/bade509a61c126d7f488/test_coverage)](https://codeclimate.com/github/tdreyno/fizz/test_coverage)
[![npm latest version](https://img.shields.io/npm/v/@tdreyno/fizz/latest.svg)](https://www.npmjs.com/package/@tdreyno/fizz)

Fizz is a small library for building state machines that can effectively manage complex sequences of events. [Learn more about state machines (and charts).](https://statecharts.github.io)

## Install

```bash
yarn add @tdreyno/fizz
```

## Design

Fizz attempts to provide an API that is "Just Javascript" and operates in a pure and functional manner[^1].

States are mappings of actions to future states. The action type is the same format as a Redux action.

States return one or more side-effects (or a Task of one or more side-effects), which are simply functions which will be called in the order they were generated at the end of the state transition.

States can be `enter`ed by sending the `Enter` action. Here is an example of a simple state which logs a message upon entering.

```typescript
import { state, Enter } from "@tdreyno/fizz"

const MyState = state<Enter>({
  Enter: () => log("Entered state MyState."),
})
```

In this case, `log` is a side-effect which will log to the console. It is implemented like so:

```javascript
// The side-effect generating function.
function log(msg) {
  // A representation of the effect, but not the execution.
  return internalEffect(
    // An effect name. Helps when writing tests and middleware.
    "log",

    // The data associated with the effect. Also good for tests and middleware.
    msg,

    // Finally, the method which will execute the effect
    () => console.log(msg),
  )
}
```

This level of indirection, returning a function that will cause an action, rather than immediately executing the action, gives us some interesting abilities.

First, all of our states are pure functions, even if they will eventually communicate with external systems. This allows for very easy testing of state logic.

Second, external middleware can see the requested side-effects and modify them if necessary. Say you can one side-effect to update a user's first name via an HTTP POST to the server and you had a second side-effect to update their last name. Because we can modify the list (and implementations) of the effects before they run, we could write middleware to combine those two effects into 1-single HTTP POST.

It is the opinion of this library that "original Redux was right." Simple functions, reducers and switch statements make reasoning about code easy. In the years since Redux was released, folks have many to DRY-up the boilerplate and have only complicated what was a very simple system. We are not interesting in replacing `switch` statements with more complex alternatives. If this causes an additional level of nesting, so be it.

### Let's play pong.

This example shows how we would model something like a game of Pong.

```typescript
import {
  state,
  createAction,
  ActionCreatorType,
  onFrame,
  OnFrame,
  Enter,
} from "@tdreyno/fizz"

export const start = createAction("Start")
export type Start = ActionCreatorType<typeof start>

export const onPaddleInput = createAction("OnPaddleInput")
export type OnPaddleInput = ActionCreatorType<typeof onPaddleInput>

type Data = {
  ballPosition: [x: number, y: number]
  ballVector: [x: number, y: number]
  leftPaddle: number
  rightPaddle: number
}

const Welcome = state<Start, Data>({
  Start: () =>
    Playing({
      ballPosition: [0, 0],
      ballVector: [1, 1],
      leftPaddle: 0,
      rightPaddle: 0,
    }),
})

const Playing = state<Enter | OnPaddleInput | OnFrame, Data>({
  Enter: onFrame,

  OnPaddleInput: (data, { whichPaddle, direction }, { update }) => {
    data[whichPaddle] = data[whichPaddle] + direction

    return update(data)
  },

  OnFrame: (data, _, { update }) => {
    // Handle bouncing off things.
    if (doesIntersectPaddle(data) || doesTopOrBottom(data)) {
      data.ballVector = [data.ballVector[0] * -1, data.ballVector[1] * -1]

      return [update(data), onFrame()]
    }

    // Handle scoring
    if (isOffscreen(data)) {
      return Victory(ballPosition < 0 ? "Left" : "Right")
    }

    // Otherwise run physics
    data.ballPosition = [
      data.ballPosition[0] + data.ballVector[0],
      data.ballPosition[1] + data.ballVector[1],
    ]

    return [update(data), onFrame()]
  },
})

const Victory = state<Enter, string>({
  Enter: (data, winner) => log(`Winner is ${winner}`),
})
```

`onFrame` is an action that is called via `requestAnimationFrame`. Assume `doesIntersectPaddle`, `doesTopOrBottom` and `isOffscreen` are doing bounding boxes checks.

Our renderer can now check the current state each frame and decide whether to render the Welcome screen, the Victory screen or the game of Pong.

## Technical details

Fizz is implemented in TypeScript and is distributed with `.d.ts` files.

[^1]: Internally there is some data mutation, but this can be replaced by a more immutable approach if necessary without modifying the external API.
