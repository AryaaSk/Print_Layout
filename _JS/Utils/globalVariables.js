"use strict";
const PAPER_POSITION = { left: 0, top: 0 }; //position relative, left=x, top=y
let PAPER_HEIGHT_MM = 297;
let PAPER_WIDTH_MM = 210;
const DEFAULT_PAPER_MARGIN_PX = 50;
const DPI = window.devicePixelRatio;
let MM_PX_SF = 1;
let ZOOM = 1;
const IMAGES = []; //rotation in degrees
const DEFAULT_IMAGE_OFFSET_MM = 5;
const DEFAULT_IMAGE_SIZE_MM = 200;
const TRANSFORM_OVERLAY_RESIZE_RADIUS = 15;
let [MOUSE_X, MOUSE_Y] = [0, 0];
let SELECTED_IMAGE_INDEX = undefined;
let UPDATE_CANVAS = false;
