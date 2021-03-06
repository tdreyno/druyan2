export class Action_<T extends string, P> {
  constructor(public type: T, public payload: P) {}
}

export const Action = <T extends string, P>(type: T, payload: P) =>
  new Action_(type, payload)
export type Action<T extends string, P> = Action_<T, P>

export type ActionName<A extends Action<any, any>, T = A["type"]> =
  T extends string ? T : never

export type ActionPayload<A extends Action<any, any>> = A["payload"]

export const isAction = <T extends string>(a: unknown): a is Action<T, any> =>
  a instanceof Action_

export const isActions = (
  actions: unknown,
): actions is Array<Action<any, any>> =>
  Array.isArray(actions) && actions.every(isAction)

export interface MatchAction<T extends string, P> {
  is(action: Action<any, any>): action is Action<T, P>
}

export type ActionCreator<T extends string, P> = P extends undefined
  ? () => Action<T, undefined>
  : (payload: P) => Action<T, P>

export type ActionCreatorType<F extends ActionCreator<any, any>> = ReturnType<F>

export const createAction = <T extends string, P = undefined>(
  type: T,
): ActionCreator<T, P> & MatchAction<T, P> => {
  const fn = (payload?: P) => Action(type, payload)

  fn.is = (action: Action<any, any>): action is Action<T, P> =>
    action.type === type

  return fn as unknown as ActionCreator<T, P> & MatchAction<T, P>
}

export const enter = createAction("Enter")
export type Enter = ActionCreatorType<typeof enter>

export const exit = createAction("Exit")
export type Exit = ActionCreatorType<typeof exit>

export const onFrame = createAction<"OnFrame", number>("OnFrame")
export type OnFrame = ActionCreatorType<typeof onFrame>
