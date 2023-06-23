<!--
    * Font awesome icon
    Creates a an icon using class names from font awesome
    @param name <string> Name of a font awesome icon class
    @param color
    @return An SVG icon component
-->
<script lang="ts">
    export let name:string;
    export let style:'solid' | 'brands' | 'regular' | undefined = undefined;
    export let color:string | undefined = undefined;
    export let size:'2xs' | 'xs' | 'sm' | 'lg' | 'xl' | '2xl' | undefined = undefined;
    export let className:string | undefined = undefined;
</script>

<i class="
    text-{color ?? "black"} 
    fa-{style ?? "regular"} 
    fa-{name} 
    fa-{size ?? 'lg'}
    {className}
"/>