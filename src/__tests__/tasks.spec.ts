import { Task } from "@tdreyno/pretty-please"
import { Enter, enter, createAction, ActionCreatorType } from "../action"
import { effect, noop } from "../effect"
import { createRuntime } from "../runtime"
import { stateWrapper, StateReturn } from "../state"
import { createInitialContext } from "./createInitialContext"

describe("Tasks", () => {
  const trigger = createAction("Trigger")
  type Trigger = ActionCreatorType<typeof trigger>

  const B = stateWrapper("B", (action: Enter) => {
    switch (action.type) {
      case "Enter":
        return noop()
    }
  })

  test("should run an action with a task", () => {
    const A = stateWrapper("A", (action: Enter | Trigger) => {
      switch (action.type) {
        case "Enter":
          return Task.of(trigger())

        case "Trigger":
          return B()
      }
    })

    const context = createInitialContext([A()])

    const runtime = createRuntime(context, ["Trigger"])

    expect.hasAssertions()

    runtime.run(enter()).fork(jest.fn(), () => {
      expect(runtime.currentState().name).toBe("B")
    })

    jest.runAllTimers()
  })

  test("should run an action with a promise", () => {
    const promise = Promise.resolve(trigger())

    const A = stateWrapper("A", (action: Enter | Trigger) => {
      switch (action.type) {
        case "Enter":
          return promise

        case "Trigger":
          return B()
      }
    })

    const context = createInitialContext([A()])

    const runtime = createRuntime(context, ["Trigger"])

    expect.hasAssertions()

    return new Promise<void>(resolve => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      runtime.run(enter()).fork(jest.fn(), async () => {
        await promise

        expect(runtime.currentState().name).toBe("B")

        resolve()
      })
    })
  })

  test("should run transition handler result from a task", () => {
    const A = stateWrapper("A", (action: Enter) => {
      switch (action.type) {
        case "Enter":
          return Task.of(B())
      }
    })

    const context = createInitialContext([A()])

    const runtime = createRuntime(context)

    expect.hasAssertions()

    runtime.run(enter()).fork(jest.fn(), () => {
      expect(runtime.currentState().name).toBe("B")
    })

    jest.runAllTimers()
  })

  test("should run a single effect returned by the task", () => {
    const myEffectExecutor = jest.fn()
    const myEffect = effect("myEffect", undefined, myEffectExecutor)

    const A = stateWrapper("A", (action: Enter) => {
      switch (action.type) {
        case "Enter":
          return Task.of(myEffect)
      }
    })

    const context = createInitialContext([A()])

    const runtime = createRuntime(context)

    expect.hasAssertions()

    runtime.run(enter()).fork(jest.fn(), () => {
      expect(myEffectExecutor).toBeCalled()
    })

    jest.runAllTimers()
  })

  test("should run multiple effects returned by the task", () => {
    const myEffectExecutor1 = jest.fn()
    const myEffect1 = effect("myEffect", undefined, myEffectExecutor1)

    const myEffectExecutor2 = jest.fn()
    const myEffect2 = effect("myEffect", undefined, myEffectExecutor2)

    const A = stateWrapper("A", (action: Enter) => {
      switch (action.type) {
        case "Enter":
          return Task.of([myEffect1, myEffect2])
      }
    })

    const context = createInitialContext([A()])

    const runtime = createRuntime(context)

    expect.hasAssertions()

    runtime.run(enter()).fork(jest.fn(), () => {
      expect(myEffectExecutor1).toBeCalled()
      expect(myEffectExecutor2).toBeCalled()
    })

    jest.runAllTimers()
  })

  test("should run update functions", () => {
    const A = stateWrapper(
      "A",
      (action: Enter, name: string, { update }): StateReturn => {
        switch (action.type) {
          case "Enter":
            return Task.of(update(name + name))
        }
      },
    )

    const context = createInitialContext([A("Test")])

    const runtime = createRuntime(context)

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(context.currentState.data[0]).toBe("Test")

    runtime.run(enter()).fork(jest.fn(), jest.fn())

    jest.runAllTimers()

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(context.currentState.data[0]).toBe("TestTest")
  })

  test("should run effects after an update", () => {
    const myEffectExecutor1 = jest.fn()
    const myEffect1 = effect("myEffect", undefined, myEffectExecutor1)

    const A = stateWrapper(
      "A",
      (action: Enter, name: string, { update }): StateReturn => {
        switch (action.type) {
          case "Enter":
            return Task.of([update(name + name), myEffect1])
        }
      },
    )

    const context = createInitialContext([A("Test")])

    const runtime = createRuntime(context)

    expect.hasAssertions()

    runtime.run(enter()).fork(jest.fn(), () => {
      expect(myEffectExecutor1).toBeCalled()
    })

    jest.runAllTimers()
  })
})
