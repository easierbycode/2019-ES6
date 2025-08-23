export class HitTester {
    static hitTestFunc(obj1, obj2) {
        if (!obj1 || !obj2 || !obj1.hitArea || !obj2.hitArea) {
            return false; // Cannot test without objects or hitAreas
        }

        // Get global positions and dimensions
        const bounds1 = obj1.getBounds();
        const bounds2 = obj2.getBounds();

        // Calculate global hitArea rectangles
        const hitArea1 = new PIXI.Rectangle(
            bounds1.x + obj1.hitArea.x,
            bounds1.y + obj1.hitArea.y,
            obj1.hitArea.width,
            obj1.hitArea.height
        );
        const hitArea2 = new PIXI.Rectangle(
            bounds2.x + obj2.hitArea.x,
            bounds2.y + obj2.hitArea.y,
            obj2.hitArea.width,
            obj2.hitArea.height
        );

        // Simple AABB (Axis-Aligned Bounding Box) collision check
        return hitArea1.x < hitArea2.x + hitArea2.width &&
               hitArea1.x + hitArea1.width > hitArea2.x &&
               hitArea1.y < hitArea2.y + hitArea2.height &&
               hitArea1.y + hitArea1.height > hitArea2.y;
    }

     // Original Center-based method (less accurate with PIXI transforms)
     /*
    static hitTestFuncCenterBased(obj1, obj2) {
        if (!obj1 || !obj2 || !obj1.hitArea || !obj2.hitArea) return false;

        const centerX1 = obj1.x + obj1.hitArea.x + obj1.hitArea.width / 2;
        const centerY1 = obj1.y + obj1.hitArea.y + obj1.hitArea.height / 2;
        const centerX2 = obj2.x + obj2.hitArea.x + obj2.hitArea.width / 2;
        const centerY2 = obj2.y + obj2.hitArea.y + obj2.hitArea.height / 2;

        const halfWidth1 = obj1.hitArea.width / 2;
        const halfHeight1 = obj1.hitArea.height / 2;
        const halfWidth2 = obj2.hitArea.width / 2;
        const halfHeight2 = obj2.hitArea.height / 2;

        const dx = centerX1 - centerX2;
        const dy = centerY1 - centerY2;

        const combinedHalfWidths = halfWidth1 + halfWidth2;
        const combinedHalfHeights = halfHeight1 + halfHeight2;

        return Math.abs(dx) < combinedHalfWidths && Math.abs(dy) < combinedHalfHeights;
    }
    */
}