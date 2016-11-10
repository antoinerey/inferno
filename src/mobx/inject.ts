import hoistStatics from 'hoist-non-inferno-statics';
import createClass from 'inferno-create-class';
import createElement from 'inferno-create-element';
import { IProps } from '../core/shapes';

interface IStoreProps extends IProps {
	ref: any;
}

/**
 * Store Injection
 */
function createStoreInjector (grabStoresFn, component) {
	const Injector: any = createClass({
		displayName: component.name,
		render() {
			const newProps = <IStoreProps> {};
			for (let key in this.props) {
				if (this.props.hasOwnProperty(key)) {
					newProps[key] = this.props[key];
				}
			}
			const additionalProps = grabStoresFn(this.context.mobxStores || {}, newProps, this.context) || {};
			for ( let key in additionalProps ) {
				newProps[ key ] = additionalProps[ key ];
			}
			newProps.ref = instance => {
				this.wrappedInstance = instance;
			};

			return createElement(component, newProps);
		}
	});

	Injector.contextTypes = { mobxStores() {} };
	injectStaticWarnings(Injector, component);
	hoistStatics(Injector, component);

	return Injector;
}

function injectStaticWarnings(hoc, component) {
	if (typeof process === "undefined" || !process.env || process.env.NODE_ENV === "production") {
		return;
	}

	['propTypes', 'defaultProps', 'contextTypes'].forEach(prop => {
		const propValue = hoc[prop];
		Object.defineProperty(hoc, prop, {
			set (_) {
				// enable for testing:
				const name = component.displayName || component.name;
				console.warn(`Mobx Injector: you are trying to attach ${prop} to HOC instead of ${name}. Use 'wrappedComponent' property.`);
			},
			get () {
				return propValue;
			},
			configurable: true
		});
	});
}

const grabStoresByName = (storeNames) => (baseStores, nextProps) => {
	storeNames.forEach(function(storeName) {

		// Prefer props over stores
		if (storeName in nextProps) {
			return;
		}

		if (!(storeName in baseStores)) {
			throw new Error(
				`MobX observer: Store "${storeName}" is not available! ` +
				`Make sure it is provided by some Provider`
			);
		}

		nextProps[storeName] = baseStores[storeName];
	});
	return nextProps;
};

/**
 * Higher order component that injects stores to a child.
 * takes either a varargs list of strings, which are stores read from the context,
 * or a function that manually maps the available stores from the context to props:
 * storesToProps(mobxStores, props, context) => newProps
 */
export default function inject (grabStoresFn): any {

	if (typeof grabStoresFn !== 'function') {

		let storesNames: any = [];
		for (let i = 0; i < arguments.length; i++) {
			storesNames[i] = arguments[i];
		}

		grabStoresFn = grabStoresByName(storesNames);
	}

	return componentClass => createStoreInjector(grabStoresFn, componentClass);
}