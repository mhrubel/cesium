/*global define*/
define([
        '../Core/Color',
        '../Core/destroyObject',
        '../Core/EquidistantCylindricalProjection',
        '../Core/Ellipsoid',
        '../Core/DeveloperError',
        '../Core/BoundingRectangle',
        '../Core/Occluder',
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Renderer/Context',
        '../Renderer/PixelFormat',
        '../Renderer/PixelDatatype',
        './Camera',
        './CompositePrimitive',
        './AnimationCollection',
        './SceneMode',
        './SceneState',
        './ViewportQuad',
        './FrameState',
        '../Shaders/PostFX/PassThrough',
        '../Shaders/PostFX/LuminanceFS',
        '../Shaders/PostFX/BlackAndWhite',
        '../Shaders/PostFX/EightBit',
        '../Shaders/PostFX/NightVision',
        '../Shaders/PostFX/Brightness',
        '../Shaders/PostFX/Contrast',
        '../Shaders/PostFX/Toon',
        '../Shaders/PostFX/Fog',
        '../Shaders/PostFX/DepthOfField',
        '../Shaders/PostFX/AmbientOcclusion',
        '../Shaders/PostFX/CombinedEffects'
    ], function(
        Color,
        destroyObject,
        EquidistantCylindricalProjection,
        Ellipsoid,
        DeveloperError,
        BoundingRectangle,
        Occluder,
        BoundingSphere,
        Cartesian3,
        Context,
        PixelFormat,
        PixelDatatype,
        Camera,
        CompositePrimitive,
        AnimationCollection,
        SceneMode,
        FrameState,
        ViewportQuad,
        PassThrough,
        LuminanceFS,
        BlackAndWhite,
        EightBit,
        NightVision,
        Brightness,
        Contrast,
        Toon,
        Fog,
        DepthOfField,
        AmbientOcclusion,
        CombinedEffects) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias Scene
     * @constructor
     */
    var Scene = function(canvas) {
        var context = new Context(canvas);

        this._frameState = new FrameState();
        this._canvas = canvas;
        this._context = context;
        this._primitives = new CompositePrimitive();
        this._pickFramebuffer = undefined;
        this._camera = new Camera(canvas);
        this._clearState = context.createClearState({
            color : Color.BLACK,
            depth : 1.0
        });

        this._animate = undefined; // Animation callback
        this._animations = new AnimationCollection();

        this._shaderFrameCount = 0;

        /**
         * The current mode of the scene.
         *
         * @type SceneMode
         */
        this.mode = SceneMode.SCENE3D;

        /**
         * DOC_TBA
         */
        this.scene2D = {
            /**
             * The projection to use in 2D mode.
             */
            projection : new EquidistantCylindricalProjection(Ellipsoid.WGS84)
        };

        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type Number
         */
        this.morphTime = 1.0;

        this._framebuffer = undefined;

        this._postFXIndex = 0;
        this._postFXs = [
            new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), PassThrough),
            new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), LuminanceFS),
            new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), BlackAndWhite),
            new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), EightBit),
            new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), NightVision),
            new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), Brightness),
            new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), Contrast),
            new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), Toon),
            new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), Fog),
            new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), DepthOfField),
            new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), AmbientOcclusion),
            new ViewportQuad(new Rectangle(0.0, 0.0, canvas.clientWidth, canvas.clientHeight), CombinedEffects)
        ];
    };

    Scene.prototype.nextPostFX = function() {
        this._postFXIndex = (this._postFXIndex === this._postFXs.length - 1) ? 0 : (this._postFXIndex + 1);
    };

    Scene.prototype.prevPostFX = function() {
        this._postFXIndex = (this._postFXIndex === 0) ? this._postFXs.length - 1 : (this._postFXIndex - 1);
    };

    Scene.prototype.incT = function() {
        this._postFXs[this._postFXIndex].t -= 0.05; // more bright/contrast
    };

    Scene.prototype.decT = function() {
        this._postFXs[this._postFXIndex].t += 0.05;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getCanvas = function() {
        return this._canvas;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getContext = function() {
        return this._context;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getPrimitives = function() {
        return this._primitives;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getCamera = function() {
        return this._camera;
    };
    // TODO: setCamera

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getUniformState = function() {
        return this._context.getUniformState();
    };

    /**
     * Gets state information about the current scene.
     *
     * @memberof Scene
     */
    Scene.prototype.getFrameState = function() {
        return this._frameState;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getAnimations = function() {
        return this._animations;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.setSunPosition = function(sunPosition) {
        this.getUniformState().setSunPosition(sunPosition);
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getSunPosition = function() {
        return this.getUniformState().getSunPosition();
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.setAnimation = function(animationCallback) {
        this._animate = animationCallback;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getAnimation = function() {
        return this._animate;
    };

    function clearPasses(passes) {
        passes.pick = false;
    }

    function updateFrameState(scene) {
        var camera = scene._camera;

        var frameState = scene._frameState;
        frameState.mode = scene.mode;
        frameState.scene2D = scene.scene2D;
        frameState.camera = camera;
        frameState.occluder = undefined;

        // TODO: The occluder is the top-level central body. When we add
        //       support for multiple central bodies, this should be the closest one.
        var cb = scene._primitives.getCentralBody();
        if (scene.mode === SceneMode.SCENE3D && typeof cb !== 'undefined') {
            var ellipsoid = cb.getEllipsoid();
            var occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, ellipsoid.getMinimumRadius()), camera.getPositionWC());
            frameState.occluder = occluder;
        }

        clearPasses(frameState.passes);
    }

    Scene.prototype._update = function() {
        var us = this.getUniformState();
        var camera = this._camera;

        // Destroy released shaders once every 120 frames to avoid thrashing the cache
        if (this._shaderFrameCount++ === 120) {
            this._shaderFrameCount = 0;
            this._context.getShaderCache().destroyReleasedShaderPrograms();
        }

        this._animations.update();
        camera.update();
        us.setProjection(camera.frustum.getProjectionMatrix());
        if (camera.frustum.getInfiniteProjectionMatrix) {
            us.setInfiniteProjection(camera.frustum.getInfiniteProjectionMatrix());
        }
        us.setView(camera.getViewMatrix());

        if (this._animate) {
            this._animate();
        }

        updateFrameState(this);
        this._primitives.update(this._context, this._frameState);
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.render = function() {
        this._update();

// TODO: recreate if width or height changes
        if (!this._framebuffer) {
            var width = this._canvas.clientWidth;
            var height = this._canvas.clientHeight;

            this._framebuffer = this._context.createFramebuffer({
                colorTexture : this._context.createTexture2D({
                    width : width,
                    height : height
                }),
                depthTexture : this._context.createTexture2D({
                    width : width,
                    height : height,
                    pixelFormat : PixelFormat.DEPTH_COMPONENT,
                    pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                })
            });
        }
        this._context._HACK_framebuffer = this._framebuffer;

//        this._context.clear(this._clearState);

        this._primitives.render(this._context);

        this._context._HACK_framebuffer = undefined;

// TODO: _postFX doesn't use sceneState so we pull off this hack.
        var sceneState = undefined;
        var postFX = this._postFXs[this._postFXIndex];

// TODO: if width or height changes, ViewQuad needs to be recreated
        postFX.setTexture(this._framebuffer.getColorTexture());
        postFX.setDepthTexture(this._framebuffer.getDepthTexture());
        postFX.update(this._context, sceneState);
        postFX.render(this._context);
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.pick = function(windowPosition) {
        var context = this._context;
        var primitives = this._primitives;
        var frameState = this._frameState;

        this._pickFramebuffer = this._pickFramebuffer || context.createPickFramebuffer();
        var fb = this._pickFramebuffer.begin();

        updateFrameState(this);
        frameState.passes.pick = true;

        primitives.update(context, frameState);
        primitives.renderForPick(context, fb);

        return this._pickFramebuffer.end({
            x : windowPosition.x,
            y : (this._canvas.clientHeight - windowPosition.y)
        });
    };

    /**
     * Pick an ellipsoid or map.
     *
     * @memberof Scene
     *
     * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to pick.
     *
     * @exception {DeveloperError} windowPosition is required.
     *
     * @return {Cartesian3} If the ellipsoid or map was picked, returns the point on the surface of the ellipsoid or map
     * in world coordinates. If the ellipsoid or map was not picked, returns undefined.
     */
    Scene.prototype.pickEllipsoid = function(windowPosition, ellipsoid) {
        if (typeof windowPosition === 'undefined') {
            throw new DeveloperError('windowPosition is required.');
        }

        ellipsoid = ellipsoid || Ellipsoid.WGS84;

        var p;
        if (this.mode === SceneMode.SCENE3D) {
            p = this._camera.pickEllipsoid(windowPosition, ellipsoid);
        } else if (this.mode === SceneMode.SCENE2D) {
            p = this._camera.pickMap2D(windowPosition, this.scene2D.projection);
        } else if (this.mode === SceneMode.COLUMBUS_VIEW) {
            p = this._camera.pickMapColumbusView(windowPosition, this.scene2D.projection);
        }

        return p;
    };

    /**
     * View an extent on an ellipsoid or map.
     *
     * @memberof Scene
     *
     * @param {Extent} extent The extent to view.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to view.
     *
     * @exception {DeveloperError} extent is required.
     */
    Scene.prototype.viewExtent = function(extent, ellipsoid) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        ellipsoid = ellipsoid || Ellipsoid.WGS84;

        if (this.mode === SceneMode.SCENE3D) {
            this._camera.viewExtent(extent, ellipsoid);
        } else if (this.mode === SceneMode.SCENE2D) {
            this._camera.viewExtent2D(extent, this.scene2D.projection);
        } else if (this.mode === SceneMode.COLUMBUS_VIEW) {
            this._camera.viewExtentColumbusView(extent, this.scene2D.projection);
        }
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.destroy = function() {
        this._postFX = this._postFX && this._postFX.destroy();
        this._camera = this._camera && this._camera.destroy();
        this._pickFramebuffer = this._pickFramebuffer && this._pickFramebuffer.destroy();
        this._primitives = this._primitives && this._primitives.destroy();
        this._context = this._context && this._context.destroy();
        return destroyObject(this);
    };

    return Scene;
});