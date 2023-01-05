# XstateController

![Lit](https://img.shields.io/badge/lit-3.0.0-blue.svg)

Playground:
- [xstate.js.org](https://xstate.js.org/docs/)
- [xstate.js.org - examples](https://xstate.js.org/docs/examples/counter.html)
- [Original idea](https://codesandbox.io/s/z3o0s?file=/src/toggleMachine.ts)
- [Original idea](https://www.thisdot.co/blog/state-machines-using-xstate-and-svelte-part-1)
- [xstate.web.js](https://github.com/statelyai/xstate/issues/787#issuecomment-551940687)

- [xstate-lit](https://github.com/InsightSoftwareConsortium/xstate-lit/tree/main)

## Demo

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/oscarmarina/XstateController)

## Installation

```bash
npm i && npm start
```

- [Web Component with Lit - Scaffolding](https://github.com/oscarmarina/create-wc)
<hr>


### `src/XstateController.js`:

#### class: `XstateController`

##### Fields

| Name      | Privacy | Type | Default   | Description | Inherited From |
| --------- | ------- | ---- | --------- | ----------- | -------------- |
| `state`   |         |      |           |             |                |
| `send`    |         |      |           |             |                |
| `service` |         |      |           |             |                |
| `propKey` |         |      | `propKey` |             |                |

##### Methods

| Name               | Privacy | Description | Parameters | Return | Inherited From |
| ------------------ | ------- | ----------- | ---------- | ------ | -------------- |
| `hostConnected`    |         |             |            |        |                |
| `hostDisconnected` |         |             |            |        |                |

<hr/>

#### Exports

| Kind | Name               | Declaration      | Module                  | Package |
| ---- | ------------------ | ---------------- | ----------------------- | ------- |
| `js` | `XstateController` | XstateController | src/XstateController.js |         |

### `src/XstateCounter.js`:

#### class: `XstateCounter`

##### Static Fields

| Name | Privacy | Type     | Default            | Description | Inherited From |
| ---- | ------- | -------- | ------------------ | ----------- | -------------- |
| `is` |         | `string` | `'xstate-counter'` |             |                |

##### Fields

| Name                | Privacy | Type     | Default                                                 | Description | Inherited From |
| ------------------- | ------- | -------- | ------------------------------------------------------- | ----------- | -------------- |
| `counterController` |         |          | `new XstateController(this, counterMachine, '_xstate')` |             |                |
| `_xstate`           | public  | `object` |                                                         |             |                |

##### Attributes

| Name      | Field    | Inherited From |
| --------- | -------- | -------------- |
| `_xstate` | \_xstate |                |

<details><summary>Private API</summary>

##### Fields

| Name        | Privacy | Type | Default | Description | Inherited From |
| ----------- | ------- | ---- | ------- | ----------- | -------------- |
| `#disabled` | private |      |         |             |                |

</details>

<hr/>

#### Exports

| Kind | Name            | Declaration   | Module               | Package |
| ---- | --------------- | ------------- | -------------------- | ------- |
| `js` | `XstateCounter` | XstateCounter | src/XstateCounter.js |         |

### `src/counterMachine.js`:

#### Variables

| Name             | Description | Type |
| ---------------- | ----------- | ---- |
| `counterMachine` |             |      |

<hr/>

#### Exports

| Kind | Name             | Declaration    | Module                | Package |
| ---- | ---------------- | -------------- | --------------------- | ------- |
| `js` | `counterMachine` | counterMachine | src/counterMachine.js |         |

### `src/styles/xstate-counter-styles.css.js`:

#### Variables

| Name     | Description | Type |
| -------- | ----------- | ---- |
| `styles` |             |      |

<hr/>

#### Exports

| Kind | Name     | Declaration | Module                                  | Package |
| ---- | -------- | ----------- | --------------------------------------- | ------- |
| `js` | `styles` | styles      | src/styles/xstate-counter-styles.css.js |         |

### `define/xstate-counter.js`:

#### Exports

| Kind                        | Name | Declaration   | Module                | Package |
| --------------------------- | ---- | ------------- | --------------------- | ------- |
| `custom-element-definition` |      | XstateCounter | /src/XstateCounter.js |         |

### `index.js`:

#### Exports

| Kind | Name            | Declaration   | Module                 | Package |
| ---- | --------------- | ------------- | ---------------------- | ------- |
| `js` | `XstateCounter` | XstateCounter | ./src/XstateCounter.js |         |
