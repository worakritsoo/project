<script>
	import { quintOut } from 'svelte/easing';
	import { crossfade } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import Box from '$lib/Components/Box.svelte';
	import Modal from '$lib/Components/Modal.svelte';
	let showModal = false;

	const [send, receive] = crossfade({
		fallback(node, params) {
			const style = getComputedStyle(node);
			const transform = style.transform === 'none' ? '' : style.transform;

			return {
				duration: 400,
				easing: quintOut,
				css: (t) => `
					transform: ${transform} scale(${t});
					opacity: ${t}
				`
			};
		}
	});

	const children = [];
	let todos = [
		{ id: 1, done: false, title: 'กล่องเก็บของ' },
		{ id: 2, done: false, title: 'start writing JSConf talk' },
		{ id: 3, done: true, title: 'buy some milk' },
		{ id: 4, done: false, title: 'mow the lawn' },
		{ id: 5, done: false, title: 'feed the turtle' },
		{ id: 6, done: false, title: 'fix some bugs' }
	];
</script>

<ion-button color="pea" on:click={() => (showModal = true)}>เพิ่ม</ion-button>

{#if showModal}
	<Modal on:close={() => (showModal = false)}>
		<slot name="header"><!-- optional fallback --></slot>
	</Modal>
{/if}
