import { Enter, enter, createAction, ActionCreatorType } from "../action"
import { noop } from "../effect"
import { NoStatesRespondToAction } from "../errors"
import { createRuntime } from "../runtime"
import { stateWrapper } from "../state"
import { createInitialContext } from "./createInitialContext"

describe("Nested runtimes", () => {
  const trigger = createAction("Trigger")
  type Trigger = ActionCreatorType<typeof trigger>

  test("should send action to parents if child cannot handle it", () => {
    const Child = stateWrapper("Child", (action: Enter) => {
      switch (action.type) {
        case "Enter":
          return noop()
      }
    })

    const Parent = stateWrapper("Parent", (action: Enter | Trigger) => {
      switch (action.type) {
        case "Enter":
          return noop()

        case "Trigger":
          return ParentB()
      }
    })

    const ParentB = stateWrapper("ParentB", (action: Enter) => {
      switch (action.type) {
        case "Enter":
          return noop()
      }
    })

    const parentContext = createInitialContext([Parent()])
    const parentRuntime = createRuntime(parentContext)

    const childContext = createInitialContext([Child()])
    const childRuntime = createRuntime(
      childContext,
      [],
      undefined,
      parentRuntime,
    )

    expect.hasAssertions()

    childRuntime.run(trigger()).fork(jest.fn(), () => {
      expect(childRuntime.currentState().name).toBe("Child")
      expect(parentRuntime.currentState().name).toBe("ParentB")
    })

    jest.runAllTimers()
  })

  test("should error if parent and child cannot handle action", () => {
    const Child = stateWrapper("Child", (action: Enter) => {
      switch (action.type) {
        case "Enter":
          return noop()
      }
    })

    const Parent = stateWrapper("Parent", (action: Enter) => {
      switch (action.type) {
        case "Enter":
          return noop()
      }
    })

    const parentContext = createInitialContext([Parent()])
    const parentRuntime = createRuntime(parentContext)

    const childContext = createInitialContext([Child()])
    const childRuntime = createRuntime(
      childContext,
      [],
      undefined,
      parentRuntime,
    )

    expect.assertions(3)

    childRuntime
      .run(trigger())
      .fork(e => expect(e).toBeInstanceOf(NoStatesRespondToAction), jest.fn())

    jest.runAllTimers()

    expect(childRuntime.currentState().name).toBe("Child")
    expect(parentRuntime.currentState().name).toBe("Parent")
  })

  test("should allow parent actions to fire along with local transition", () => {
    const ChildA = stateWrapper("ChildA", (action: Enter) => {
      switch (action.type) {
        case "Enter":
          return [trigger(), ChildB()]
      }
    })

    const ChildB = stateWrapper("ChildB", (action: Enter) => {
      switch (action.type) {
        case "Enter":
          return noop()
      }
    })

    const ParentA = stateWrapper("ParentA", (action: Enter | Trigger) => {
      switch (action.type) {
        case "Enter":
          return noop()

        case "Trigger":
          return ParentB()
      }
    })

    const ParentB = stateWrapper("ParentB", (action: Enter) => {
      switch (action.type) {
        case "Enter":
          return noop()
      }
    })

    const parentContext = createInitialContext([ParentA()])
    const parentRuntime = createRuntime(parentContext, ["Trigger"])

    const childContext = createInitialContext([ChildA()])
    const childRuntime = createRuntime(
      childContext,
      [],
      undefined,
      parentRuntime,
    )

    expect.hasAssertions()

    childRuntime.run(enter()).fork(jest.fn(), () => {
      expect(childRuntime.currentState().name).toBe("ChildB")
      expect(parentRuntime.currentState().name).toBe("ParentB")
    })

    jest.runAllTimers()
  })
})
