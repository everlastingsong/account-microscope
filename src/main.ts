import App from './App.svelte';

(BigInt.prototype as any).toJSON = function() { return this.toString(); }

const app = new App({
	target: document.body,
	props: {
		name: 'world'
	}
});

export default app;