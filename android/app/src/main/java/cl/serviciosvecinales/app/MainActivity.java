package cl.serviciosvecinales.app;

import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Mantiene la WebView dentro del área útil del teléfono.
 * Evita que la barra del sistema Android cubra la navegación de la app,
 * incluso con edge-to-edge en Android 15 y posteriores.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(android.graphics.Color.WHITE);
        getWindow().setNavigationBarColor(android.graphics.Color.WHITE);
        // Evita el sombreado gris que Android puede añadir sobre la barra blanca.
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            getWindow().setNavigationBarContrastEnforced(false);
        }

        final View webView = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
            Insets safe = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            ViewGroup.LayoutParams original = view.getLayoutParams();
            if (original instanceof ViewGroup.MarginLayoutParams) {
                ViewGroup.MarginLayoutParams layout = (ViewGroup.MarginLayoutParams) original;
                if (layout.topMargin != safe.top || layout.bottomMargin != safe.bottom
                    || layout.leftMargin != safe.left || layout.rightMargin != safe.right) {
                    layout.setMargins(safe.left, safe.top, safe.right, safe.bottom);
                    view.setLayoutParams(layout);
                }
            }
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(webView);
    }
}
