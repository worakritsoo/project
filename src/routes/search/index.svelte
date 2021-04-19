<!--  key with name title -->
<script>
	import Fuse from 'fuse.js';
	import linklist from '$lib/Data/db.json';
	import LinkCard from '$lib/Components/LinkCard.svelte';
	import Box from '$lib/Components/Box.svelte';
	import ContactCard from '$lib/Components/ContactCard.svelte';
	export let textInputs = '';

	const fuse = new Fuse(linklist, {
		keys: ['name', 'title', 'url'],
		includeScore: true
	});
	$: linkResult = fuse.search(textInputs);

	function finding() {
		return 'กำลังหาจากเซิฟเวอร์';
	}
</script>

<!-- markup (zero or more items) goes here -->
<section>
	<div class="flex justify-center my-5">
		<input
			class=" text-center bg-purple-200 hover:bg-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50 "
			type="search"
			bind:value={textInputs}
			placeholder="ค้นหา"
		/>
		<button on:click={finding}> ค้นหา🚀 </button>
	</div>

	{#if finding}
		<div class="grid">
			<ul>
				{#each linkResult as link}
					<!-- <Box>
					<ContactCard>
						<span slot="name"> {link.item.title} </span>

						<span slot="address">
							<a href={link.item.url}>{link.item.url}</a>
						</span>
						<p>
							{link.item.user}
						</p>
					</ContactCard>
				</Box> -->

					<LinkCard {...link.item} />
					<!-- content here -->
				{/each}
			</ul>
		</div>
	{/if}
</section>

<style>
</style>
