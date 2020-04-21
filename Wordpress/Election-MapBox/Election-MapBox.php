<?php
/**
 * Plugin Name: Election Maps
 * Description: Plugin that allows for election maps using MapBox API
 */

/**
* Register the "map" custom post type
*/
function pluginprefix_setup_post_type() {
    register_post_type( 'map', ['public' => true ] ); 
} 
add_action( 'init', 'pluginprefix_setup_post_type' );
 
 
/**
 * Activate the plugin.
 */
function pluginprefix_activate() { 
    // Trigger our function that registers the custom post type plugin.
    pluginprefix_setup_post_type(); 
    // Clear the permalinks after the post type has been registered.
    flush_rewrite_rules(); 
}
register_activation_hook( __FILE__, 'pluginprefix_activate' );
/**
 * Deactivation hook.
 */
function pluginprefix_deactivate() {
    // Unregister the post type, so the rules are no longer in memory.
    unregister_post_type( 'map' );
    // Clear the permalinks to remove our post type's rules from the database.
    flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'pluginprefix_deactivate' );
/**
 * Map block type
 */
function Election_Maps_01_register_block() {
 
    // automatically load dependencies and version
    $asset_file = include( plugin_dir_path( __FILE__ ) . 'build/index.asset.php');
 
    wp_register_script(
        'map-js',
        plugins_url( 'blockbrowserify.js', __FILE__ ),
        array( 'wp-blocks', 'wp-i18n', 'wp-element' ),
		filemtime( plugin_dir_path( __FILE__ ) . 'blockbrowserify.js' )
    );
 
    register_block_type( 'custom-blocks/Election-Map', array(
        'editor_script' => 'map-js',
    ) );
 
}
add_action( 'init', 'Election_Maps_01_register_block' );
 ?>
