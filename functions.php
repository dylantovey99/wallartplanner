<?php
// Secure session initialization - only call once
add_action('init', 'register_my_session');

function register_my_session()
{
    // Check if session is already active
    if (session_status() === PHP_SESSION_NONE) {
        // Set secure session parameters BEFORE starting session
        ini_set('session.cookie_httponly', 1);
        ini_set('session.cookie_secure', 1); // Requires HTTPS
        ini_set('session.cookie_samesite', 'Strict');
        ini_set('session.use_strict_mode', 1);
        ini_set('session.gc_maxlifetime', 3600);

        session_set_cookie_params([
            'lifetime' => 3600,
            'path' => '/',
            'domain' => $_SERVER['HTTP_HOST'] ?? '',
            'secure' => true,      // HTTPS only
            'httponly' => true,    // No JavaScript access
            'samesite' => 'Strict' // CSRF protection
        ]);

        session_start();
    }
}
add_filter('wc_session_expiring', 'filter_ExtendSessionExpiring');

add_filter('wc_session_expiration', 'filter_ExtendSessionExpired');



function filter_ExtendSessionExpiring($seconds)
{

    return 60 * 60 * 71;
}

function filter_ExtendSessionExpired($seconds)
{

    return 60 * 60 * 72;
}



/**
 * Generate cryptographically secure unique ID
 * @param int $length Desired length of ID
 * @return string Secure random ID
 */
function getUniqueId($length = 32)
{
    try {
        // Use random_bytes for cryptographically secure randomness
        $bytes = random_bytes(ceil($length / 2));
        $unique_value = bin2hex($bytes);
        return substr($unique_value, 0, $length);
    } catch (Exception $e) {
        // Fallback to openssl_random_pseudo_bytes
        error_log('random_bytes failed, using openssl fallback: ' . $e->getMessage());
        $bytes = openssl_random_pseudo_bytes(ceil($length / 2));
        $unique_value = bin2hex($bytes);
        return substr($unique_value, 0, $length);
    }
}

// IMPORTANT: Define encryption key in wp-config.php for production
// define('WALL_ART_ENCRYPTION_KEY', 'your-64-character-hex-key-here');
// Generate key with: echo bin2hex(random_bytes(32));

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param string $data Data to encrypt
 * @return string|false Base64 encoded encrypted data or false on failure
 */
function encryptData($data)
{
    // Use defined key or generate temporary one (not secure for production!)
    $key = defined('WALL_ART_ENCRYPTION_KEY') ?
           hex2bin(WALL_ART_ENCRYPTION_KEY) :
           'temp-key-CHANGE-IN-PRODUCTION!!'; // 32 chars for AES-256

    if (!defined('WALL_ART_ENCRYPTION_KEY')) {
        error_log('WARNING: Using temporary encryption key. Define WALL_ART_ENCRYPTION_KEY in wp-config.php');
    }

    $cipher = 'aes-256-gcm';
    $ivLength = openssl_cipher_iv_length($cipher);

    if ($ivLength === false) {
        error_log('Cipher not supported: ' . $cipher);
        return false;
    }

    $iv = openssl_random_pseudo_bytes($ivLength);
    $tag = '';

    $encrypted = openssl_encrypt(
        $data,
        $cipher,
        $key,
        OPENSSL_RAW_DATA,
        $iv,
        $tag,
        '',
        16 // Tag length
    );

    if ($encrypted === false) {
        error_log('Encryption failed: ' . openssl_error_string());
        return false;
    }

    // Combine IV + tag + encrypted data
    return base64_encode($iv . $tag . $encrypted);
}

/**
 * Decrypt data encrypted with encryptData()
 * @param string $encrypted Base64 encoded encrypted data
 * @return string|false Decrypted data or false on failure
 */
function decryptData($encrypted)
{
    $key = defined('WALL_ART_ENCRYPTION_KEY') ?
           hex2bin(WALL_ART_ENCRYPTION_KEY) :
           'temp-key-CHANGE-IN-PRODUCTION!!';

    $cipher = 'aes-256-gcm';
    $ivLength = openssl_cipher_iv_length($cipher);
    $tagLength = 16;

    $decoded = base64_decode($encrypted);
    if ($decoded === false || strlen($decoded) < ($ivLength + $tagLength)) {
        error_log('Invalid encrypted data format');
        return false;
    }

    $iv = substr($decoded, 0, $ivLength);
    $tag = substr($decoded, $ivLength, $tagLength);
    $ciphertext = substr($decoded, $ivLength + $tagLength);

    $decrypted = openssl_decrypt(
        $ciphertext,
        $cipher,
        $key,
        OPENSSL_RAW_DATA,
        $iv,
        $tag
    );

    if ($decrypted === false) {
        error_log('Decryption failed: ' . openssl_error_string());
        return false;
    }

    return $decrypted;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use encryptData() instead
 */
function encodeAndChunkData($data, $chunkSize = 100)
{
    error_log('DEPRECATED: encodeAndChunkData() uses insecure base64. Use encryptData() instead.');
    $encrypted = encryptData($data);
    if ($encrypted === false) {
        return false;
    }
    return str_split($encrypted, $chunkSize);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use decryptData() instead
 */
function decodeChunks($chunks)
{
    error_log('DEPRECATED: decodeChunks() uses insecure base64. Use decryptData() instead.');
    $encrypted = implode('', $chunks);
    return decryptData($encrypted);
}

/**
 * Validate and sanitize image upload
 * @param array $file File from $_FILES
 * @return array Result with 'success' or 'error' key
 */
function validate_image_upload($file)
{
    $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $max_size = 5 * 1024 * 1024; // 5MB

    // Check if file exists
    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        return ['error' => 'No file uploaded or invalid upload'];
    }

    // Check file size
    if ($file['size'] > $max_size) {
        return ['error' => 'File too large. Maximum 5MB allowed'];
    }

    // Verify MIME type using finfo
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, $allowed_types, true)) {
        return ['error' => 'Invalid file type. Only JPEG, PNG, GIF, and WebP allowed'];
    }

    // Validate image dimensions
    $image_info = getimagesize($file['tmp_name']);
    if ($image_info === false) {
        return ['error' => 'Invalid image file or corrupted'];
    }

    // Check reasonable dimensions (prevent memory exhaustion)
    if ($image_info[0] > 10000 || $image_info[1] > 10000) {
        return ['error' => 'Image dimensions too large. Maximum 10000x10000 pixels'];
    }

    return ['success' => true, 'mime' => $mime, 'dimensions' => $image_info];
}

/**
 * Sanitize frame data from user input
 * @param array $data Raw frame data
 * @return array Sanitized frame data
 */
function sanitize_frame_data($data)
{
    $sanitized = [
        'printWidth' => max(0.1, min(200, floatval($data['printWidth'] ?? 16))),
        'printHeight' => max(0.1, min(200, floatval($data['printHeight'] ?? 20))),
        'mattWidth' => max(0, min(50, floatval($data['mattWidth'] ?? 5))),
        'frameWidth' => in_array($data['frameWidth'] ?? 20, [20, 30, 40], true) ?
                        intval($data['frameWidth']) : 20,
        'frameMaterial' => in_array($data['frameMaterial'] ?? 'black',
                                   ['black', 'white', 'oak', 'walnut'], true) ?
                          sanitize_text_field($data['frameMaterial']) : 'black',
        'count' => max(1, min(100, intval($data['count'] ?? 1)))
    ];

    return $sanitized;
}
include('lib/upload-resized-images.php');
//include('lib/ajax-checkout.php');
include('lib/photoframshortcode.php');
include('lib/admin-product-layout.php');
include('lib/woocommerce-functions.php');
include('lib/frontend-layouts.php');
/**
 * Theme functions and definitions.
 *
 * For additional information on potential customization options,
 * read the developers' documentation:
 *
 * https://developers.elementor.com/docs/hello-elementor-theme/
 *
 * @package HelloElementorChild
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

define('NEVE_CHILD_VERSION', '1.0');

/**
 * Load child theme scripts & styles.
 *
 * @return void
 */

function frame_upload_url()
{

    return home_url('/wp-content/uploads/photoframes/');
}



function frame_upload_path()
{

    $upload_dir = wp_upload_dir(); // Grab uploads folder array

    $path = trailingslashit($upload_dir['basedir']) . 'photoframes/'; // Set storage directory path

    return $path;
}
function hello_elementor_child_scripts_styles()
{
    if (!session_id()) {
        session_start();
    }
    global $post, $woocommerce;
    wp_enqueue_style(
        'neve-child-style',
        get_stylesheet_directory_uri() . '/style.css',
        [
            'neve-theme-style',
        ],
        NEVE_CHILD_VERSION
    );  
    $product_layout_json = get_post_meta($post->ID, '_farame_layout', true);

    if ($product_layout_json) {
        $product_slug =  $post->ID;
        if (!isset($_SESSION["photoframekey"])) {
            $_SESSION["photoframekey"] = [];
        }
        
        // Check if the specific frame key exists or is empty, then set it to the current time
        if (!isset($_SESSION["photoframekey"]["frame_" . $product_slug]) || $_SESSION["photoframekey"]["frame_" . $product_slug] == '') {
            $_SESSION["photoframekey"]["frame_" . $product_slug] = time();
        }
        if (isset($_GET['newcropper']) && $_GET['newcropper'] != '') {
            $_SESSION["newcropper"]=1;
        }
        
                            if(isset($_GET['testaws'])&&$_GET['testaws']!=''){
                                $_SESSION["testaws"]=1;
                            }
                            if (isset($_SESSION["testaws"]) && $_SESSION["testaws"]!='') {
                                
                                
                                
                            wp_enqueue_style( 'cropit', get_stylesheet_directory_uri() . '/assets/cropit/css/cropit.css?t=' . time(), array(), '0.1.0', 'all');

                            wp_enqueue_style( 'jquery-fancybox', get_stylesheet_directory_uri() . '/assets/cropit/css/jquery.fancybox.css?t=' . time(), array(), '0.1.0', 'all');

                            wp_enqueue_style( 'animate', get_stylesheet_directory_uri() . '/assets/cropit/css/animate.css?t=' . time(), array(), '0.1.0', 'all');

                            wp_enqueue_style( 'custom-icon', get_stylesheet_directory_uri() . '/assets/cropit/icon/flaticon.css?t=' . time(), array(), '0.1.0', 'all');
                            wp_enqueue_style('micromodal-css', get_stylesheet_directory_uri() . '/assets/cropit/css/framestyle_aws.css?t=' . time(), array(), '0.1.0', 'all');

                            wp_enqueue_style( 'jquery-confirm', get_stylesheet_directory_uri() . '/assets/cropit/css/jquery-confirm.min.css?t=' . time(), array(), '0.1.0', 'all');

                            wp_enqueue_script( 'jquery-confirm', get_stylesheet_directory_uri() . '/assets/cropit/js/jquery-confirm.min.js', '', '1.1', true );
                            wp_enqueue_script( 'cropit-script', get_stylesheet_directory_uri() . '/assets/cropit/js/jquery.cropit.js', '', '1.1', true );

                            wp_enqueue_script( 'fancyselebox-script', get_stylesheet_directory_uri() . '/assets/cropit/js/jquery.fancybox.js', '', '1.1', true );

                            wp_enqueue_script( 'cropit-script', get_stylesheet_directory_uri() . '/assets/cropit/js/jquery.cropit.js', '', '1.1', true );

                            wp_enqueue_script( 'fancybox-script', get_stylesheet_directory_uri() . '/assets/cropit/js/jquery.fancybox.js', '', '1.1', true );

                            wp_enqueue_script( 'load-image-script', get_stylesheet_directory_uri() . '/assets/cropit/js/load-image.js', '', '1.1', true );

                            wp_enqueue_script( 'load-image-orientation-script', get_stylesheet_directory_uri() . '/assets/cropit/js/load-image-orientation.js', '', '1.1', true );

                            wp_enqueue_script( 'load-image-meta-script', get_stylesheet_directory_uri() . '/assets/cropit/js/load-image-meta.js', '', '1.1', true );

                            wp_enqueue_script( 'load-image-exif-script', get_stylesheet_directory_uri() . '/assets/cropit/js/load-image-exif.js', '', '1.1', true );

                            wp_enqueue_script( 'load-image-exif-map-script', get_stylesheet_directory_uri() . '/assets/cropit/js/load-image-exif-map.js', '', '1.1', true );

                            wp_enqueue_script( 'canvas2image', get_stylesheet_directory_uri() . '/assets/cropit/js/canvas2image.js', '', '1.1', true );

                            wp_enqueue_script( 'html2canvas.min', get_stylesheet_directory_uri() . '/assets/cropit/js/html2canvas.min.js', '', '1.1', true );
                            wp_register_script( 'frame_upload', get_stylesheet_directory_uri() . '/assets/cropit/js/upload_photo.js?t='.time(), '', '1.1', true );
                            wp_enqueue_script( 'frame_upload' );


            }else{
                wp_enqueue_script('micromodal-js', get_stylesheet_directory_uri() . '/assets/js/micromodal.min.js', '', '1.1', true);
             //   wp_enqueue_script('cropme-js', get_stylesheet_directory_uri() . '/assets/js/cropme.min.js?t=' . time(), '', '1.1', true);
            //    wp_enqueue_style('cropme-css', get_stylesheet_directory_uri() . '/assets/css/cropme.min.css', array(), '0.1.0', 'all');
            //    wp_enqueue_style('micromodal-css', get_stylesheet_directory_uri() . '/assets/css/framestyle.css?t=' . time(), array(), '0.1.0', 'all');
            wp_enqueue_script('load-jquery-uiscript', "https://code.jquery.com/ui/1.12.1/jquery-ui.js", '', '1.1', true);
            wp_enqueue_script('load-touch-punch-script', "https://cdnjs.cloudflare.com/ajax/libs/jqueryui-touch-punch/0.2.3/jquery.ui.touch-punch.min.js", '', '1.1', true);
      
            wp_enqueue_style('jqueryui-css', 'https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.css', array(), '0.1.0', 'all');
            wp_enqueue_style('cropme-css', get_stylesheet_directory_uri() . '/assets/css/cropper.css', array(), '0.1.0', 'all');
            wp_enqueue_script('cropit-js', get_stylesheet_directory_uri() . '/assets/js/cropper.min.js?t=' . time(), '', '1.1', true);
            wp_enqueue_style('micromodal-css', get_stylesheet_directory_uri() . '/assets/css/framestyle_aws.css?t=' . time(), array(), '0.1.0', 'all');

 
            }
        
       wp_enqueue_style('fricon-css', get_stylesheet_directory_uri() . '/assets/icon/icon.css?t=' . time(), array(), '0.1.0', 'all');
          if(isset($_GET['testaws'])&&$_GET['testaws']!=''){
        wp_enqueue_script('aws-sdk', "https://cdnjs.cloudflare.com/ajax/libs/aws-sdk/2.1147.0/aws-sdk.min.js", '1.1', true);

        wp_enqueue_script('frame_upload', get_stylesheet_directory_uri() . '/assets/js/frame-upload_aws.js?ttt=' . time(), '', '1.1', true);

      }else{
        wp_enqueue_script('aws-sdk', "https://cdnjs.cloudflare.com/ajax/libs/aws-sdk/2.1147.0/aws-sdk.min.js", '1.1', true);

        wp_enqueue_script('frame_upload', get_stylesheet_directory_uri() . '/assets/js/frame-upload_aws.js?ttt=' . time(), '', '1.1', true);

      //  wp_enqueue_script('frame_upload', get_stylesheet_directory_uri() . '/assets/js/frame-upload.js?ttt=' . time(), '', '1.1', true);

      }
        wp_localize_script('frame_upload', 'frame_params', array(

            'ajaxurl' => site_url() . '/wp-admin/admin-ajax.php', // WordPress AJAX
            'postid' => $post->ID,
            'addmore' => 'Add More ' . get_the_title($post->ID),
            'link' => get_the_permalink($post->ID),
            'shop' => get_permalink(woocommerce_get_page_id('shop')),
            'siteURL' => home_url(),

        ));
       
    }
}
add_action('wp_enqueue_scripts', 'hello_elementor_child_scripts_styles', 20);

// Clean up Afterpay payment method display in emails
add_filter('woocommerce_get_order_item_totals', 'clean_payment_method_display', 10, 2);
function clean_payment_method_display($total_rows, $order) {
    if (isset($total_rows['payment_method'])) {
        $payment_method = $order->get_payment_method();
        $payment_method_title = $order->get_payment_method_title();
        
        // If it's Afterpay, clean up the display
        if (strpos($payment_method_title, 'Afterpay') !== false) {
            $total_rows['payment_method']['value'] = 'Afterpay';
        }
    }
    return $total_rows;
}

// Add custom CSS for cart item separator and Afterpay spacing
add_action('wp_head', 'add_custom_styles');
function add_custom_styles() {
    ?>
    <style>
        /* Cart item separator */
        .woocommerce-cart table.cart tr.cart_item {
            border-bottom: 1px solid #000;
        }
        .woocommerce-cart table.cart tr.cart_item:last-child {
            border-bottom: none;
        }
        
        /* Afterpay spacing */
        .afterpay-payment-info {
            margin-top: 40px !important;
            margin-bottom: 40px !important;
        }
        
        /* Ensure spacing between Afterpay and buttons */
        .woocommerce-checkout #payment .payment_method_afterpay {
            margin-bottom: 40px;
        }
        
        /* Additional spacing for Afterpay messaging */
        .afterpay-paragraph {
            margin-top: 40px;
            margin-bottom: 40px;
        }

        /* Add padding to proceed to checkout button */
        .wc-proceed-to-checkout {
            padding-top: 40px !important;
        }

        /* Enhanced Afterpay separation */
        /* Cart page specific */
        .cart_totals .afterpay-payment-info,
        .cart_totals .afterpay-widget-wrapper,
        .cart_totals [data-afterpay-widget] {
            margin-bottom: 40px !important;
            padding-bottom: 40px !important;
            border-bottom: 1px solid #e5e5e5;
        }

        /* Checkout page specific */
        .woocommerce-checkout .afterpay-payment-info,
        .woocommerce-checkout .afterpay-widget-wrapper,
        .woocommerce-checkout [data-afterpay-widget] {
            margin-bottom: 40px !important;
            padding-bottom: 40px !important;
            border-bottom: 1px solid #e5e5e5;
        }

        /* Mobile specific adjustments */
        @media screen and (max-width: 768px) {
            .afterpay-payment-info,
            .afterpay-widget-wrapper,
            [data-afterpay-widget] {
                margin-bottom: 40px !important;
                padding-bottom: 40px !important;
            }
            
            .wc-proceed-to-checkout {
                padding-top: 40px !important;
                margin-top: 20px !important;
            }
        }
    </style>
    <?php
}

// Add a function to print debugging information in the footer
function print_debug_info_in_footer() {
    global $post, $woocommerce;
    $product_id = $post->ID;
    // Sample data for debugging (you can replace this with any data)
   
if(isset($_GET['dlog'])){
    $photoframekey = $_SESSION['photoframekey'];
    if (isset($_SESSION['photoframekey'])) {
           
            $jsonData = get_post_meta($product_id, "_farame_layout", true);
          
            $framedata=$_SESSION["googleapple"];
            if ($jsonData != "") {
                $Colour = ($_SESSION[ 'photoframe' ][$photoframekey["frame_" . $product_id]]['selectedColor'])?$_SESSION[ 'photoframe' ][$photoframekey["frame_" . $product_id]]['selectedColor']:"Black";

                $orderdata=array();
                                foreach ($framedata as $key1 => $item) {
                               foreach ( $item['frame'] as $key => $frame) {
                                $dpi = 300;
                                $image = "";
                                $product_slug =$product_id;
                                if (isset($_SESSION[ 'photoframe' ]) &&
                                    $_SESSION[ 'photoframe' ][$key1]["frame_" . $product_slug][$frame]['cropped'] != ""
                                ) {

                                    $size=$item['size'][$key];
                                        $sourceimage = $_SESSION[ 'photoframe' ][$key1]["frame_" . $product_slug][$frame]['source'];

                                        $croppedImg = $_SESSION[ 'photoframe' ][$key1]["frame_" . $product_slug][$frame]['cropped'];

                                        $orderdata[]= array('frame' => $frame, 'source'=> $sourceimage,'cropped'=>$croppedImg,'size' => $size,"Colour"=>$Colour);
                                        
                                }
                            }
                        
                }
                $cart_item_data[$photoframekey["frame_" . $product_id]] = $orderdata;
                print_r($cart_item_data);
        }
    }        }

    
}

// Hook the function to the footer
add_action('wp_footer', 'print_debug_info_in_footer');
