import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import categoriesRouter from "./categories";
import videosRouter from "./videos";
import socialLinksRouter from "./social_links";
import uploadRouter from "./upload";
import packagesRouter from "./packages";
import videoCallsRouter from "./video_calls";

const router: IRouter = Router();

router.use(uploadRouter);
router.use(healthRouter);
router.use(adminRouter);
router.use(categoriesRouter);
router.use(videosRouter);
router.use(socialLinksRouter);
router.use(packagesRouter);
router.use(videoCallsRouter);

export default router;
